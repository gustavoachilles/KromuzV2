import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { registrarAuditoria } from "@/lib/audit";
import { z } from "zod";

// Excel armazena datas como serial numbers (dias desde 1899-12-30)
function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + num * 86400000);
  }
  const d = new Date(val);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) return d;
  return null;
}

// Mapeia status livre da planilha → StatusProposta enum
function mapStatus(raw: string | undefined): "RASCUNHO" | "DIGITADA" | "PENDENTE" | "APROVADA" | "REPROVADA" | "PAGA" | "CANCELADA" {
  if (!raw) return "RASCUNHO";
  const s = raw.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // PAGA
  if (s.includes("pag")) return "PAGA";
  if (s.includes("liquid")) return "PAGA";          // liquidado/liquidada
  if (s.includes("finaliz")) return "PAGA";         // finalizado/finalizada
  if (s.includes("conclu")) return "PAGA";          // concluído/concluída
  if (s.includes("efetiv")) return "PAGA";          // efetivado/efetivada
  if (s.includes("credit")) return "PAGA";          // creditado
  if (s.includes("liber")) return "PAGA";           // liberado
  // CANCELADA
  if (s.includes("cancel")) return "CANCELADA";
  if (s.includes("recus")) return "CANCELADA";      // recusado/recusada
  if (s.includes("devol")) return "CANCELADA";      // devolvido
  if (s.includes("estorn")) return "CANCELADA";     // estornado
  if (s.includes("exclui")) return "CANCELADA";     // excluído
  // REPROVADA
  if (s.includes("reprov")) return "REPROVADA";
  if (s.includes("negad")) return "REPROVADA";      // negado
  if (s.includes("indeferid")) return "REPROVADA";  // indeferido
  // APROVADA
  if (s.includes("aprov")) return "APROVADA";
  if (s.includes("averb")) return "APROVADA";       // averbado/averbada
  // PENDENTE
  if (s.includes("pendent")) return "PENDENTE";
  if (s.includes("analis")) return "PENDENTE";      // em análise
  if (s.includes("aguard")) return "PENDENTE";      // aguardando
  if (s.includes("proces")) return "PENDENTE";      // processando
  // DIGITADA
  if (s.includes("digit")) return "DIGITADA";
  if (s.includes("simul")) return "DIGITADA";
  if (s.includes("integr")) return "DIGITADA";      // integrado
  if (s.includes("novo")) return "DIGITADA";        // novo saque
  return "RASCUNHO";
}

const RecordImportSchema = z.object({
  nome: z.string().min(1),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
  uf: z.string().max(2).optional(),
  cidade: z.string().optional(),
  numeroBeneficio: z.string().optional(),
  especieBeneficio: z.number().int().optional(),
  margemLivre: z.number().optional(),
  margemRmc: z.number().optional(),
  margemRcc: z.number().optional(),
  tipoOperacao: z.string().optional(),
  origem: z.string().optional(),
  bancoAtual: z.string().optional(),
  parcelaAtual: z.number().optional(),
  saldoDevedor: z.number().optional(),
  dataDigitacao: z.string().optional(),
  codigoPropostaBanco: z.string().optional(),
  promotora: z.string().optional(),
  convenioNome: z.string().optional(),
  valorLiberado: z.number().optional(),
  statusImport: z.string().optional(),
  retornoSaldo: z.string().optional(),
  vendedorNome: z.string().optional(),
  tabela: z.string().optional(),
});

const ImportSchema = z.object({
  leads: z.array(RecordImportSchema).min(1).max(10000),
  modo: z.enum(["pular", "atualizar"]).default("pular"),
});

// POST /api/importacao-clientes — importação de carteira (Lead + Proposta)
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = ImportSchema.parse(await req.json());
    const { leads: records, modo } = body;

    // Buscar CPFs existentes (Leads)
    const cpfsNovos = records.map(l => l.cpf).filter(Boolean) as string[];
    const leadsExistentes = cpfsNovos.length > 0
      ? await prisma.lead.findMany({
          where: { empresaId: sessao.empresaId, cpf: { in: cpfsNovos } },
          select: { id: true, cpf: true },
        })
      : [];
    const cpfToLeadId = new Map(leadsExistentes.map(l => [l.cpf, l.id]));

    // Carregar tabelas de comissão para cálculo automático
    const tabelasComissao = await prisma.tabelaCoeficiente.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      include: { banco: { select: { nome: true } } },
    });

    // Indexar tabelas por nome do banco (lowercase)
    const tabelasPorBanco = new Map<string, typeof tabelasComissao>();
    for (const t of tabelasComissao) {
      const key = t.banco.nome.toLowerCase().trim();
      if (!tabelasPorBanco.has(key)) tabelasPorBanco.set(key, []);
      tabelasPorBanco.get(key)!.push(t);
    }

    // Função para calcular comissão
    function calcularComissao(bancoNome: string | null | undefined, valorLiberado: number | null | undefined): number | null {
      if (!bancoNome || !valorLiberado || valorLiberado <= 0) return null;
      const tabelas = tabelasPorBanco.get(bancoNome.toLowerCase().trim());
      if (!tabelas || tabelas.length === 0) return null;

      // Buscar tabela que mais se encaixa pelo nome (que contém faixa de valor)
      // As tabelas UNNO têm nomes como "UNNO Ametista (R$0-R$20.000)"
      let melhorTabela = null;
      let melhorPct = 0;

      for (const t of tabelas) {
        // Extrair faixa do nome: (R$X-R$Y)
        const faixaMatch = t.nome.match(/R\$\s*([\d.,]+)\s*[-–a]\s*R\$\s*([\d.,]+)/i);
        if (faixaMatch) {
          const min = Number(faixaMatch[1].replace(/\./g, "").replace(",", "."));
          const max = Number(faixaMatch[2].replace(/\./g, "").replace(",", "."));
          if (valorLiberado >= min && valorLiberado <= max && t.comissaoFlatPct) {
            melhorTabela = t;
            melhorPct = t.comissaoFlatPct;
          }
        } else if (t.comissaoFlatPct && !melhorTabela) {
          // Fallback: usar a primeira tabela com comissão
          melhorTabela = t;
          melhorPct = t.comissaoFlatPct;
        }
      }

      if (melhorPct > 0) {
        return Math.round(valorLiberado * (melhorPct / 100) * 100) / 100;
      }
      return null;
    }

    let leadsImportados = 0;
    let propostasImportadas = 0;
    let atualizados = 0;
    let pulados = 0;
    let comissoesCalculadas = 0;

    // Processar em batches de 200 (limite do Prisma createMany no Postgres)
    const batchSize = 200;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const novosLeads: any[] = [];
      const novasPropostas: any[] = [];

      for (const r of batch) {
        let leadId = r.cpf ? cpfToLeadId.get(r.cpf) : null;

        // 1. Criar Lead se não existe
        if (!leadId) {
          const lead = await prisma.lead.create({
            data: {
              empresaId: sessao.empresaId,
              nome: r.nome,
              cpf: r.cpf || null,
              telefone: r.telefone || null,
              email: r.email || null,
              uf: r.uf || null,
              cidade: r.cidade || null,
              numeroBeneficio: r.numeroBeneficio || null,
              especieBeneficio: r.especieBeneficio || null,
              margemLivre: r.margemLivre || null,
              margemRmc: r.margemRmc || null,
              margemRcc: r.margemRcc || null,
              tipoOperacao: r.tipoOperacao || null,
              origem: r.origem || "importacao",
              vendedorEmail: sessao.email,
              vendedorNome: r.vendedorNome || sessao.nomeUsuario,
              status: "IMPORTADO",
              codigoPropostaBanco: r.codigoPropostaBanco || null,
              promotora: r.promotora || null,
              convenioNome: r.convenioNome || null,
              valorLiberado: r.valorLiberado || null,
              parcelaAtual: r.parcelaAtual || null,
              saldoDevedor: r.saldoDevedor || null,
              retornoSaldo: r.retornoSaldo || null,
              tabela: r.tabela || null,
              bancoPreferido: r.bancoAtual || null,
              dataDigitacao: parseDate(r.dataDigitacao),
            },
          });
          leadId = lead.id;
          if (r.cpf) cpfToLeadId.set(r.cpf, leadId);
          leadsImportados++;
        } else if (modo === "atualizar") {
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              nome: r.nome,
              telefone: r.telefone || undefined,
              email: r.email || undefined,
              margemLivre: r.margemLivre || undefined,
              valorLiberado: r.valorLiberado || undefined,
            },
          });
          atualizados++;
        } else {
          pulados++;
        }

        // 2. Criar Proposta vinculada ao Lead
        const statusProposta = mapStatus(r.statusImport);
        const dataDig = parseDate(r.dataDigitacao);
        const now = new Date();

        // 3. Calcular comissão automaticamente
        const comissao = calcularComissao(r.bancoAtual, r.valorLiberado);
        if (comissao) comissoesCalculadas++;

        novasPropostas.push({
          empresaId: sessao.empresaId,
          leadId: leadId,
          clienteNome: r.nome,
          clienteCpf: r.cpf || null,
          clienteTelefone: r.telefone || null,
          numeroBeneficio: r.numeroBeneficio || null,
          especieBeneficio: r.especieBeneficio || null,
          tipoOperacao: r.tipoOperacao || null,
          status: statusProposta,
          codigoPropostaBanco: r.codigoPropostaBanco || null,
          valorLiberado: r.valorLiberado || null,
          valorParcela: r.parcelaAtual || null,
          saldoDevedor: r.saldoDevedor || null,
          bancoNome: r.bancoAtual || null,
          convenioNome: r.convenioNome || null,
          vendedorEmail: sessao.email,
          vendedorNome: r.vendedorNome || sessao.nomeUsuario,
          promotora: r.promotora || null,
          tabela: r.tabela || null,
          valorComissao: comissao,
          observacoes: null,
          // Datas do funil baseadas no status
          digitadaEm: dataDig || (statusProposta !== "RASCUNHO" ? now : null),
          aprovadaEm: ["APROVADA", "PAGA"].includes(statusProposta) ? (dataDig || now) : null,
          pagaEm: statusProposta === "PAGA" ? (dataDig || now) : null,
          canceladaEm: statusProposta === "CANCELADA" ? (dataDig || now) : null,
        });
      }

      // Inserir propostas em batch
      if (novasPropostas.length > 0) {
        const result = await prisma.proposta.createMany({
          data: novasPropostas,
          skipDuplicates: true,
        });
        propostasImportadas += result.count;
      }
    }

    // Auditoria
    await registrarAuditoria({
      empresaId: sessao.empresaId,
      usuarioEmail: sessao.email,
      usuarioNome: sessao.nomeUsuario,
      acao: "IMPORTACAO_CARTEIRA",
      entidade: "proposta",
      entidadeNome: `Importação de carteira`,
      detalhes: {
        total: records.length,
        leadsImportados,
        propostasImportadas,
        atualizados,
        pulados,
      },
    });

    return Response.json({
      importados: propostasImportadas,
      leadsImportados,
      atualizados,
      pulados,
      comissoesCalculadas,
      total: records.length,
    }, { status: 201 });
  } catch (e: any) {
    console.error("[IMPORTACAO] Erro:", e);
    const msg = e.message?.includes("prisma")
      ? "Erro ao salvar no banco. Verifique se todos os campos estão corretos."
      : (e.message || "Erro desconhecido ao importar");
    return Response.json({ error: msg.substring(0, 300) }, { status: 400 });
  }
}

// PUT /api/importacao-clientes — checa CPFs existentes
export async function PUT(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { cpfs } = await req.json();
    if (!Array.isArray(cpfs)) return Response.json({ error: "cpfs deve ser array" }, { status: 400 });

    const existentes = await prisma.lead.findMany({
      where: { empresaId: sessao.empresaId, cpf: { in: cpfs.filter(Boolean) } },
      select: { cpf: true },
    });

    return Response.json({ duplicados: existentes.map(e => e.cpf) });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
