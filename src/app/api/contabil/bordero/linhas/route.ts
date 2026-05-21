import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Retorna as linhas de um borderô específico
export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const borderoId = searchParams.get("borderoId");
    if (!borderoId) return NextResponse.json({ error: "borderoId obrigatório" }, { status: 400 });

    const linhas = await prisma.borderoLinha.findMany({
      where: { borderoId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(linhas);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar linhas" }, { status: 500 });
  }
}
