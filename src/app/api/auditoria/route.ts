import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// GET /api/auditoria — lista últimos logs de auditoria
export async function GET(req: Request) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const url = new URL(req.url);
    const entidade = url.searchParams.get("entidade");
    const limite = Math.min(Number(url.searchParams.get("limite") || 50), 200);

    const logs = await prisma.auditLog.findMany({
      where: {
        empresaId: sessao.empresaId,
        ...(entidade ? { entidade } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limite,
    });

    return Response.json(logs);
  } catch (e) {
    console.error("[AUDITORIA]", e);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
