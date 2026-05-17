import { NextRequest, NextResponse } from "next/server";
import { parseHisconPdf } from "@/lib/simulador/parser-v3";
import { processarHisconV3 } from "@/lib/simulador/extrator-hiscon";
import { calcularOportunidades, ClienteSimulacao, ContratoAtivo } from "@/lib/motor-regras/simulador";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export const maxDuration = 60; // 60 segundos (limite para Vercel Pro)
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 [Simulador] Recebendo requisição...");
    
    // Autenticação segura via Sessão
    const sessao = await getSessionEmpresaApi();
    if (!sessao) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    const targetEmpresaId = sessao.empresaId;

    const body = await req.json();
    const { pdfBase64, idadeManual, margemManual } = body;

    if (!pdfBase64) {
      return NextResponse.json({ error: "Parâmetro pdfBase64 é obrigatório." }, { status: 400 });
    }

    const buffer = Buffer.from(pdfBase64, "base64");

    // 1. Tenta extrair dados via Robô (Parser Local)
    console.log("📄 [Simulador] Iniciando extração do PDF com o Robô Local...");
    let hiscon;
    let pdfRawText = "";
    let iaRan = false;
    let iaResult = "";
    try {
      hiscon = await parseHisconPdf(buffer);
      // Captura texto raw para debug
      try {
        const pdfParseMod: any = (await import('pdf-parse')).default || (await import('pdf-parse'));
        const pdfData = await pdfParseMod(buffer);
        pdfRawText = (pdfData.text || "").substring(0, 3000);
      } catch { /* ignore */ }
      console.log(`✅ [Simulador] Robô leu o PDF com sucesso! (Contratos achados: ${hiscon.contratos_ativos.length})`);
      
      // Se o robô não achar contratos OU não achar margem, tenta IA
      const margemZero = (hiscon.dados_cliente.margens?.emprestimo_livre || 0) === 0;
      if (hiscon.contratos_ativos.length === 0 || margemZero) {
        console.log(`⚠️ [Simulador] Robô incompleto (contratos: ${hiscon.contratos_ativos.length}, margem: ${margemZero ? '0' : 'OK'}). Tentando IA...`);
        const extracao = await processarHisconV3(pdfBase64);
        iaRan = true;
        if (extracao.ok) {
          console.log("✅ [Simulador] IA completou a extração!");
          iaResult = JSON.stringify(extracao.dados.dados_cliente?.margens);
          hiscon = extracao.dados;
        } else {
          iaResult = `FALHOU: ${extracao.erro}`;
          console.log("ℹ️ [Simulador] IA falhou:", extracao.erro);
        }
      }
    } catch (e: any) {
      console.warn("⚠️ [Simulador] Robô falhou com erro, tentando via IA como fallback...", e.message);
      const extracao = await processarHisconV3(pdfBase64);
      
      if (!extracao.ok) {
        console.error("❌ [Simulador] IA também falhou:", extracao.erro);
        return NextResponse.json({ 
          error: `O Robô Local falhou ao ler o PDF (${e.message}) e a IA de fallback também falhou: ${extracao.erro}` 
        }, { status: 422 });
      } else {
        hiscon = extracao.dados;
        console.log("✅ [Simulador] IA leu o PDF com sucesso!");
      }
    }

    // 2. Mapeia para os tipos do simulador
    console.log("🗺️ [Simulador] Mapeando dados do cliente...");
    const dataAtual = new Date();
    let ddb = new Date(hiscon.dados_cliente.data_despacho_beneficio);
    if (isNaN(ddb.getTime())) ddb = dataAtual;

    // 2. Uso da Idade Manual ou Padrão de 60 anos (pois não existe no HISCON)
    const idade = idadeManual ? Number(idadeManual) : 60;

    const clienteSimulacao: ClienteSimulacao = {
      idade: idade,
      uf: hiscon.dados_cliente.uf,
      especie: hiscon.dados_cliente.especie_beneficio,
      especieNome: (hiscon.dados_cliente as any).especie_nome ?? null,
      numeroBeneficio: (hiscon.dados_cliente as any).numero_beneficio ?? null,
      possuiRepresentanteLegal: hiscon.dados_cliente.possui_representante_legal,
      dataDespachoBeneficio: ddb,
      margemLivre: margemManual || hiscon.dados_cliente.margens?.emprestimo_livre || 0,
      margemRmc: hiscon.dados_cliente.margens?.cartao_rmc_livre || 0,
      margemRcc: hiscon.dados_cliente.margens?.cartao_rcc_livre || 0,
    };

    const contratosAtivos: ContratoAtivo[] = hiscon.contratos_ativos.map((c: any, index: number) => ({
      id: `contrato-${index}`,
      bancoNome: c.banco || c.banco_nome || c.bank || "Banco",
      valorParcela: c.valor_parcela || c.installment_value || 0,
      parcelasPagas: c.parcelas_pagas || c.installments_paid || 0,
      parcelasTotal: c.prazo_total || c.number_of_installments || c.total_installments || 84,
      taxaJuros: c.taxa_juros_mensal || c.interest_monthly || c.interest_rate || 1.66,
      saldoDevedorEstimado: c.saldo_devedor_estimado || c.amount_loaned || 0,
      prazoRestante: (c.prazo_total || c.number_of_installments || 84) - (c.parcelas_pagas || c.installments_paid || 0),
      especieOriginal: (c.especie || hiscon.dados_cliente.especie_beneficio)?.toString() || "",
      dataInicio: c.data_inicio || c.start_date || null,
      dataFim: c.data_fim || c.end_date || null,
      valorContrato: c.valor_emprestado || c.amount_loaned || 0,
    }));

    // 3. Busca Regras e Tabelas do Banco de Dados
    console.log("🗄️ [Simulador] Buscando regras e tabelas no banco de dados...");
    const [regras, tabelas, bancos] = await Promise.all([
      prisma.regraProdutoCredito.findMany({
        where: { empresaId: targetEmpresaId, ativa: true },
      }),
      prisma.tabelaCoeficiente.findMany({
        where: { empresaId: targetEmpresaId, ativo: true },
      }),
      prisma.banco.findMany({
        where: { empresaId: targetEmpresaId, status: "ativo" },
      })
    ]);
    console.log(`✅ [Simulador] Banco respondeu: ${regras.length} regras, ${tabelas.length} tabelas e ${bancos.length} bancos encontrados.`);

    // 4. Calcula Oportunidades
    console.log("⚖️ [Simulador] Calculando oportunidades...");
    const { oportunidades, contratosAtualizados } = calcularOportunidades(clienteSimulacao, contratosAtivos, regras, tabelas, bancos);
    console.log("🏁 [Simulador] Simulação concluída!");

    // Debug: Análise de portabilidade por contrato
    const portRegras = regras.filter(r => r.tipoOperacao === "PORTABILIDADE");
    const portRefinRegras = regras.filter(r => r.tipoOperacao === "PORTABILIDADE_REFIN");
    const portOps = oportunidades.filter(o => o.tipo === "PORTABILIDADE" || o.tipo === "PORTABILIDADE_REFIN");
    
    const debugPort = contratosAtivos.map(c => ({
      contrato: c.bancoNome,
      parcela: c.valorParcela,
      taxa: c.taxaJuros,
      prazoRestante: c.prazoRestante,
      saldoDevedor: c.saldoDevedorEstimado,
      opsGeradas: portOps.filter(o => o.contratoOriginalId === c.id).map(o => ({
        banco: o.bancoNome,
        tipo: o.tipo,
        troco: o.trocoEstimado,
        prazo: o.prazo
      })),
      regrasPortChecadas: portRegras.map(r => {
        const tab = tabelas.find(t => t.bancoId === r.bancoId && t.produtoId === r.produtoId && t.prazo >= c.prazoRestante);
        return {
          banco: r.bancoNome,
          temTabela: !!tab,
          tabelaPrazo: tab?.prazo,
          coef: tab?.coeficiente,
          liberado: tab ? c.valorParcela / tab.coeficiente : 0,
          troco: tab ? (c.valorParcela / tab.coeficiente) - c.saldoDevedorEstimado : 0,
          mesmoBanco: c.bancoNome.toUpperCase().includes(r.bancoNome.toUpperCase()) || r.bancoNome.toUpperCase().includes(c.bancoNome.toUpperCase()),
        };
      })
    }));

    return NextResponse.json({
      cliente: {
        ...clienteSimulacao,
        nome: hiscon.dados_cliente.nome
      },
      contratos: contratosAtualizados,
      oportunidades,
      _debug: {
        regrasAtivas: regras.length,
        tabelasAtivas: tabelas.length,
        bancosAtivos: bancos.length,
        portRegras: portRegras.length,
        portRefinRegras: portRefinRegras.length,
        opsPortGeradas: portOps.length,
        margemExtraida: hiscon.dados_cliente.margens,
        contratosExtraidos: hiscon.contratos_ativos.length,
        fonte: (hiscon as any)._fonte || "parser+ia",
        pdfRawText: pdfRawText,
        iaRan,
        iaResult,
        debugPortabilidade: debugPort,
      }
    });

  } catch (error: any) {
    console.error("❌ [Simulador] ERRO CRÍTICO NA ROTA:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao processar simulação." }, { status: 500 });
  }
}
