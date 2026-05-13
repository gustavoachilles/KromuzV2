import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function GET() {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversas = await prisma.conversa.findMany({
      where: { empresaId: sessao.empresaId },
      include: { canal: true, mensagens: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json(conversas);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
