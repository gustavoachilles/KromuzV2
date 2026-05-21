import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Lista mensagens rápidas da empresa
export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const msgs = await prisma.mensagemRapida.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      orderBy: { titulo: "asc" },
    });
    return NextResponse.json(msgs);
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

// POST — Criar mensagem rápida
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { titulo, conteudo, atalho, categoria } = await req.json();
    if (!titulo || !conteudo) return NextResponse.json({ error: "Título e conteúdo obrigatórios" }, { status: 400 });
    const msg = await prisma.mensagemRapida.create({
      data: { empresaId: sessao.empresaId, titulo, conteudo, atalho: atalho || null, categoria: categoria || null },
    });
    return NextResponse.json(msg, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar" }, { status: 500 });
  }
}

// PUT — Editar
export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { id, ...dados } = await req.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    const existing = await prisma.mensagemRapida.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const msg = await prisma.mensagemRapida.update({ where: { id }, data: dados });
    return NextResponse.json(msg);
  } catch {
    return NextResponse.json({ error: "Erro ao editar" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    const existing = await prisma.mensagemRapida.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.mensagemRapida.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
