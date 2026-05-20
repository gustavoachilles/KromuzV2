import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// POST /api/rh/ponto/pausa — registrar pausa NR-17
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresa();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { funcionarioId, registroPontoId, tipoPausa } = await req.json();

  // Verificar que existe e pertence à empresa
  const func = await prisma.funcionario.findFirst({
    where: { id: funcionarioId, empresaId: sessao.empresaId },
  });
  if (!func) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  // Só telemarketing tem pausa NR-17
  if (func.tipoJornada !== "TELEMARKETING_6H") {
    return NextResponse.json({ error: "Pausas NR-17 são aplicáveis apenas para jornada de Telemarketing" }, { status: 400 });
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
  const registro = await prisma.registroPonto.findUnique({
    where: { id: registroPontoId },
    include: { pausas: true },
  });

  return NextResponse.json(registro);
}
