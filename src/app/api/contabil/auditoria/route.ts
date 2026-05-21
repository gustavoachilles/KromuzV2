import { NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // Apenas admin/dono pode ver auditoria
    if (!["dono", "admin"].includes(sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entidade = searchParams.get("entidade");
    const acao = searchParams.get("acao");
    const email = searchParams.get("email");
    const limit = parseInt(searchParams.get("limit") || "200");

    const where: any = { empresaId: sessao.empresaId };
    if (entidade) where.entidade = entidade;
    if (acao) where.acao = acao;
    if (email) where.usuarioEmail = email;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
    });

    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar logs" }, { status: 500 });
  }
}
