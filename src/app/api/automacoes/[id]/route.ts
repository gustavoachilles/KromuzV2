import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const fluxo = await prisma.automacaoFluxo.findFirst({
      where: { id: params.id, empresaId: sessao.empresaId },
    });

    if (!fluxo) return NextResponse.json({ error: "Fluxo não encontrado" }, { status: 404 });

    return NextResponse.json(fluxo);
  } catch (e) {
    console.error("[AUTOMACAO_ID_GET]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const fluxoExistente = await prisma.automacaoFluxo.findFirst({
      where: { id: params.id, empresaId: sessao.empresaId },
    });

    if (!fluxoExistente) return NextResponse.json({ error: "Fluxo não encontrado" }, { status: 404 });

    const body = await req.json();
    const { nome, descricao, ativo, nodes, edges, gatilhoTipo } = body;

    const dataToUpdate: any = {};
    if (nome !== undefined) dataToUpdate.nome = nome;
    if (descricao !== undefined) dataToUpdate.descricao = descricao;
    if (ativo !== undefined) dataToUpdate.ativo = ativo;
    if (nodes !== undefined) dataToUpdate.nodes = nodes; // stringified JSON
    if (edges !== undefined) dataToUpdate.edges = edges; // stringified JSON
    if (gatilhoTipo !== undefined) dataToUpdate.gatilhoTipo = gatilhoTipo;

    const fluxo = await prisma.automacaoFluxo.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(fluxo);
  } catch (e) {
    console.error("[AUTOMACAO_ID_PUT]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const fluxoExistente = await prisma.automacaoFluxo.findFirst({
      where: { id: params.id, empresaId: sessao.empresaId },
    });

    if (!fluxoExistente) return NextResponse.json({ error: "Fluxo não encontrado" }, { status: 404 });

    await prisma.automacaoFluxo.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[AUTOMACAO_ID_DELETE]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
