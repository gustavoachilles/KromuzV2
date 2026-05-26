import { NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { fgtsSaldo, fgtsCalculo, FACTA_CONFIG, FACTA_FGTS_TABELAS } from "@/lib/facta";

/**
 * POST /api/facta/fgts
 * Consulta FGTS via Facta: saldo ou cálculo de antecipação
 */
export async function POST(req: Request) {
  const session = await getSessionEmpresaApi();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { acao, cpf, taxa, tabela, parcelas, jsonSaldo } = body;

    if (!cpf) {
      return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
    }

    // ── Consulta Saldo FGTS
    if (acao === "saldo" || !acao) {
      if (FACTA_CONFIG.isHomol) {
        return NextResponse.json({
          success: false,
          ambiente: "HOMOLOGAÇÃO",
          error: "Consulta de saldo FGTS só está disponível em PRODUÇÃO (consulta saldo real na Caixa). Ambiente de homologação não suporta esta funcionalidade.",
          nota: "Solicite à Facta a liberação do IP de produção.",
        }, { status: 422 });
      }

      const resultado = await fgtsSaldo(cpf);

      return NextResponse.json({
        success: !resultado.erro,
        ambiente: "PRODUÇÃO",
        ...resultado,
      });
    }

    // ── Cálculo valor líquido FGTS
    if (acao === "calculo") {
      const resultado = await fgtsCalculo({
        cpf,
        taxa,
        tabela,
        parcelas,
        jsonSaldo,
      });

      return NextResponse.json({
        success: resultado.permitido === "SIM",
        ambiente: FACTA_CONFIG.isHomol ? "HOMOLOGAÇÃO" : "PRODUÇÃO",
        ...resultado,
      });
    }

    // ── Listar tabelas FGTS disponíveis
    if (acao === "tabelas") {
      return NextResponse.json({
        success: true,
        tabelas: FACTA_FGTS_TABELAS,
      });
    }

    return NextResponse.json({ error: "Ação inválida. Use: 'saldo', 'calculo' ou 'tabelas'" }, { status: 400 });
  } catch (e: any) {
    console.error("[Facta FGTS] Erro:", e.message);
    return NextResponse.json({ error: e.message || "Erro ao consultar Facta FGTS" }, { status: 500 });
  }
}
