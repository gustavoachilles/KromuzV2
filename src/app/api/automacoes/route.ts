import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const fluxos = await prisma.automacaoFluxo.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(fluxos);
  } catch (e) {
    console.error("[AUTOMACOES_GET]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { nome, descricao } = body;

    if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const fluxo = await prisma.automacaoFluxo.create({
      data: {
        empresaId: sessao.empresaId,
        nome,
        descricao,
        nodes: "[]",
        edges: "[]",
      },
    });

    return NextResponse.json(fluxo, { status: 201 });
  } catch (e) {
    console.error("[AUTOMACOES_POST]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
