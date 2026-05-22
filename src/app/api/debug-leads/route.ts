import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export async function GET() {
  const sessao = await getSessionEmpresa();
  if (!sessao) return Response.json({ error: "Não autenticado" }, { status: 401 });

  // Restrito à empresa do usuário
  try {
    const contagens = await prisma.lead.groupBy({
      by: ['status'],
      where: { empresaId: sessao.empresaId },
      _count: true
    });
    const colunas = await prisma.pipelineColuna.findMany({
      where: { empresaId: sessao.empresaId },
      select: { nome: true }
    });
    return Response.json({ contagens, colunas });
  } catch (e: any) {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
