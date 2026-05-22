import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AutomationEngine } from "@/lib/automations/engine";

// Rota configurada para rodar a cada 1 minuto num serviço de CRON (ex: Vercel Cron ou cron-job.org)
export async function GET() {
  try {
    const agora = new Date();

    // Busca todas as execuções PAUSADAS cujo tempo de espera já passou
    const execucoesRetomadas = await prisma.execucaoFluxo.findMany({
      where: {
        status: "PAUSADO",
        aguardandoAte: { lte: agora }
      },
      take: 50 // processar em lotes para não estourar tempo de req
    });

    if (execucoesRetomadas.length === 0) {
      return NextResponse.json({ ok: true, processados: 0 });
    }

    // Passa status para RODANDO para não pegar de novo no próximo cron (lock otimista)
    await prisma.execucaoFluxo.updateMany({
      where: { id: { in: execucoesRetomadas.map(e => e.id) } },
      data: { status: "RODANDO", aguardandoAte: null }
    });

    // Retoma os fluxos
    for (const exec of execucoesRetomadas) {
      // Avança de forma assíncrona para não travar o loop
      AutomationEngine.avancarFluxo(exec.id).catch(err => {
        console.error(`Erro ao retomar fluxo ${exec.id}:`, err);
      });
    }

    return NextResponse.json({ ok: true, processados: execucoesRetomadas.length });
  } catch (error: any) {
    console.error("Erro no Cron de Automações:", error);
    return NextResponse.json({ error: "Erro interno no cron" }, { status: 500 });
  }
}
