import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contagens = await prisma.lead.groupBy({
      by: ['status'],
      _count: true
    });
    const colunas = await prisma.pipelineColuna.findMany({ select: { nome: true } });
    return Response.json({ contagens, colunas });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
