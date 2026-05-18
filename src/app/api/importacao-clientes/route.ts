import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { registrarAuditoria } from "@/lib/audit";
import { z } from "zod";

const LeadImportSchema = z.object({
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
});

const ImportSchema = z.object({
  leads: z.array(LeadImportSchema).min(1).max(10000),
  modo: z.enum(["pular", "atualizar"]).default("pular"),
});

// POST /api/importacao-clientes — importação em massa
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = ImportSchema.parse(await req.json());
    const { leads, modo } = body;

    // Buscar CPFs existentes para detectar duplicatas
    const cpfsNovos = leads.map(l => l.cpf).filter(Boolean) as string[];
    const cpfsExistentes = cpfsNovos.length > 0
      ? await prisma.lead.findMany({
          where: { empresaId: sessao.empresaId, cpf: { in: cpfsNovos } },
          select: { id: true, cpf: true },
        })
      : [];
    const cpfMap = new Map(cpfsExistentes.map(l => [l.cpf, l.id]));

    let importados = 0;
    let atualizados = 0;
    let pulados = 0;

    // Processar em batches de 500
    const batchSize = 500;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const novos = [];
      const updates = [];

      for (const l of batch) {
        const existeId = l.cpf ? cpfMap.get(l.cpf) : null;

        if (existeId) {
          if (modo === "atualizar") {
            updates.push({ id: existeId, data: l });
          } else {
            pulados++;
          }
          continue;
        }

        novos.push({
          empresaId: sessao.empresaId,
          nome: l.nome,
          cpf: l.cpf || null,
          telefone: l.telefone || null,
          email: l.email || null,
          uf: l.uf || null,
          cidade: l.cidade || null,
          numeroBeneficio: l.numeroBeneficio || null,
          especieBeneficio: l.especieBeneficio || null,
          margemLivre: l.margemLivre || null,
          margemRmc: l.margemRmc || null,
          margemRcc: l.margemRcc || null,
          tipoOperacao: (l.tipoOperacao as any) || null,
          origem: l.origem || "importacao",
          vendedorEmail: sessao.email,
          vendedorNome: sessao.nomeUsuario,
          status: "NOVO",
        });
      }

      // Criar novos
      if (novos.length > 0) {
        const result = await prisma.lead.createMany({
          data: novos,
          skipDuplicates: true,
        });
        importados += result.count;
      }

      // Atualizar existentes
      for (const u of updates) {
        await prisma.lead.update({
          where: { id: u.id },
          data: {
            nome: u.data.nome,
            telefone: u.data.telefone || undefined,
            email: u.data.email || undefined,
            uf: u.data.uf || undefined,
            cidade: u.data.cidade || undefined,
            numeroBeneficio: u.data.numeroBeneficio || undefined,
            margemLivre: u.data.margemLivre || undefined,
            margemRmc: u.data.margemRmc || undefined,
            margemRcc: u.data.margemRcc || undefined,
          },
        });
        atualizados++;
      }
    }

    // Auditoria
    await registrarAuditoria({
      empresaId: sessao.empresaId,
      usuarioEmail: sessao.email,
      usuarioNome: sessao.nomeUsuario,
      acao: "IMPORTACAO_CLIENTES",
      entidade: "lead",
      entidadeNome: `Importação em massa`,
      detalhes: { total: leads.length, importados, atualizados, pulados },
    });

    return Response.json({ importados, atualizados, pulados, total: leads.length }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// POST /api/importacao-clientes?check=duplicatas — checa CPFs existentes
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
