import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { getClientIP, isRateLimited } from "@/lib/rate-limit";
import { sanitizar } from "@/lib/validations";

// GET — Lista tags da empresa
export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const tags = await prisma.tagConversa.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

// POST — Criar tag
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const ip = getClientIP(req);
    if (isRateLimited(`${ip}:tags:POST`, 30)) return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
    const { nome, cor } = await req.json();
    if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    const tag = await prisma.tagConversa.create({
      data: { empresaId: sessao.empresaId, nome: sanitizar(nome), cor: cor || "#6366f1" },
    });
    registrarAuditoria({ empresaId: sessao.empresaId, usuarioEmail: sessao.email, acao: "CRIAR", entidade: "TAG", entidadeNome: nome });
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar tag" }, { status: 500 });
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
    const existing = await prisma.tagConversa.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.tagConversa.delete({ where: { id } });
    registrarAuditoria({ empresaId: sessao.empresaId, usuarioEmail: sessao.email, acao: "EXCLUIR", entidade: "TAG", entidadeId: id, entidadeNome: existing.nome });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
