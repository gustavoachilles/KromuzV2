import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { getClientIP, isRateLimited } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = getClientIP(req);
    if (isRateLimited(`${ip}:inbox:sync`, 120)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const conversas = await prisma.conversa.findMany({
      where: { empresaId: sessao.empresaId },
      include: {
        canal: true,
        lead: { select: { email: true, telefone: true, uf: true } },
        mensagens: { orderBy: { createdAt: "asc" }, take: 100 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(conversas);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
