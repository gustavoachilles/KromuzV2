import { NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { inssOperacoesDisponiveis, inssSimulacao, FACTA_CONFIG } from "@/lib/facta";

/**
 * POST /api/facta/inss
 * Consulta INSS via Facta: operações disponíveis ou simulação
 */
export async function POST(req: Request) {
  const session = await getSessionEmpresaApi();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { acao, cpf, dataNascimento, valor, valorParcela, prazo, tipoOperacao, codigoTabela, coeficiente } = body;

    if (!cpf) {
      return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
    }

    // ── Operações Disponíveis (consulta tabelas/taxas)
    if (acao === "operacoes" || !acao) {
      if (!dataNascimento) {
        return NextResponse.json({ error: "Data de nascimento é obrigatória para INSS" }, { status: 400 });
      }

      const resultado = await inssOperacoesDisponiveis({
        cpf,
        dataNascimento,
        valor: valor || 1000,
        valorParcela,
        prazo: prazo || 84,
        tipoOperacao: tipoOperacao || 13,
      });

      return NextResponse.json({
        success: !resultado.erro,
        ambiente: FACTA_CONFIG.isHomol ? "HOMOLOGAÇÃO" : "PRODUÇÃO",
        ...resultado,
      });
    }

    // ── Simulação (etapa 1 - gera id_simulador)
    if (acao === "simulacao") {
      if (!dataNascimento || !codigoTabela || !prazo || !valor || !valorParcela || !coeficiente) {
        return NextResponse.json({
          error: "Campos obrigatórios: dataNascimento, codigoTabela, prazo, valor, valorParcela, coeficiente",
        }, { status: 400 });
      }

      const resultado = await inssSimulacao({
        cpf,
        dataNascimento,
        codigoTabela,
        prazo,
        valorOperacao: valor,
        valorParcela,
        coeficiente,
      });

      return NextResponse.json({
        success: !resultado.erro,
        ambiente: FACTA_CONFIG.isHomol ? "HOMOLOGAÇÃO" : "PRODUÇÃO",
        ...resultado,
      });
    }

    return NextResponse.json({ error: "Ação inválida. Use: 'operacoes' ou 'simulacao'" }, { status: 400 });
  } catch (e: any) {
    console.error("[Facta INSS] Erro:", e.message);
    return NextResponse.json({ error: e.message || "Erro ao consultar Facta INSS" }, { status: 500 });
  }
}
