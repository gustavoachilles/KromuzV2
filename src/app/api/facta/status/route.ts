import { NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { getFactaToken, FACTA_CONFIG } from "@/lib/facta";

/**
 * GET /api/facta/status
 * Verifica status da integração Facta (token válido, ambiente, etc)
 */
export async function GET() {
  const session = await getSessionEmpresaApi();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const token = await getFactaToken();

    return NextResponse.json({
      success: true,
      ambiente: FACTA_CONFIG.isHomol ? "HOMOLOGAÇÃO" : "PRODUÇÃO",
      baseUrl: FACTA_CONFIG.baseUrl,
      tokenValido: !!token,
      tokenPreview: token ? `${token.substring(0, 30)}...` : null,
      nota: FACTA_CONFIG.isHomol
        ? "Usando ambiente de homologação. Consultas FGTS/saldo não disponíveis. Solicite liberação de IP à Facta para produção."
        : "Ambiente de produção ativo.",
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      ambiente: FACTA_CONFIG.isHomol ? "HOMOLOGAÇÃO" : "PRODUÇÃO",
      error: e.message,
    }, { status: 500 });
  }
}
