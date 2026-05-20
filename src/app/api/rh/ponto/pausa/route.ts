import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { temPermissao } from "@/lib/permissions";

// A5: Whitelist de tipos de pausa válidos
const TIPOS_PAUSA_VALIDOS = ["PAUSA_10MIN_1", "PAUSA_10MIN_2", "REFEICAO_20MIN"];

// POST /api/rh/ponto/pausa — registrar pausa NR-17
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!temPermissao(null, "rh", sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { funcionarioId, registroPontoId, tipoPausa } = await req.json();

    // Validar campos obrigatórios
    if (!funcionarioId || !registroPontoId || !tipoPausa) {
      return NextResponse.json({ error: "funcionarioId, registroPontoId e tipoPausa são obrigatórios" }, { status: 400 });
    }

    // A5: Validar tipo de pausa
    if (!TIPOS_PAUSA_VALIDOS.includes(tipoPausa)) {
      return NextResponse.json({ error: "Tipo de pausa inválido. Valores aceitos: PAUSA_10MIN_1, PAUSA_10MIN_2, REFEICAO_20MIN" }, { status: 400 });
    }

    // Verificar que existe e pertence à empresa
    const func = await prisma.funcionario.findFirst({
      where: { id: funcionarioId, empresaId: sessao.empresaId },
    });
    if (!func) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

    // Só telemarketing tem pausa NR-17
    if (func.tipoJornada !== "TELEMARKETING_6H") {
      return NextResponse.json({ error: "Pausas NR-17 são aplicáveis apenas para jornada de Telemarketing" }, { status: 400 });
    }

    // Verificar que o registro de ponto pertence ao funcionário
    const registro = await prisma.registroPonto.findFirst({
      where: { id: registroPontoId, funcionarioId },
    });
    if (!registro) {
      return NextResponse.json({ error: "Registro de ponto não encontrado" }, { status: 404 });
    }

    // A3: Verificar se pausa do mesmo tipo já foi registrada
    const pausaExistente = await prisma.pausaNR17.findFirst({
      where: { registroPontoId, tipoPausa },
    });
    if (pausaExistente) {
      return NextResponse.json({ error: "Esta pausa já foi registrada hoje" }, { status: 409 });
    }

    const agora = new Date();
    const duracao = tipoPausa === "REFEICAO_20MIN" ? 20 : 10;

    await prisma.pausaNR17.create({
      data: {
        funcionarioId,
        registroPontoId,
        tipoPausa,
        inicio: agora,
        fim: new Date(agora.getTime() + duracao * 60 * 1000),
        duracaoMinutos: duracao,
        cumprida: true,
      },
    });

    // Retornar registro atualizado com pausas
    const registroAtualizado = await prisma.registroPonto.findUnique({
      where: { id: registroPontoId },
      include: { pausas: true },
    });

    return NextResponse.json(registroAtualizado);
  } catch (error) {
    console.error("[RH/ponto/pausa] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao registrar pausa" }, { status: 500 });
  }
}
