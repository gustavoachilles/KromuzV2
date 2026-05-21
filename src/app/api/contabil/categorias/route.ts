import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Lista todas as categorias financeiras da empresa
export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const categorias = await prisma.categoriaFinanceira.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: [{ tipo: "asc" }, { grupo: "asc" }, { ordem: "asc" }],
    });

    return NextResponse.json(categorias);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar categorias" }, { status: 500 });
  }
}

// POST — Cria uma nova categoria financeira
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { nome, tipo, grupo, icone, cor } = body;

    if (!nome || !tipo) {
      return NextResponse.json({ error: "Nome e tipo são obrigatórios" }, { status: 400 });
    }

    const categoria = await prisma.categoriaFinanceira.create({
      data: {
        empresaId: sessao.empresaId,
        nome,
        tipo,       // RECEITA, DESPESA, IMPOSTO, TRANSFERENCIA
        grupo,      // Fixas, Variáveis, Marketing, Folha, Impostos
        icone,
        cor,
      },
    });

    return NextResponse.json(categoria, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma categoria com esse nome" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}

// PUT — Atualiza uma categoria existente
export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, ...dados } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const existing = await prisma.categoriaFinanceira.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const categoria = await prisma.categoriaFinanceira.update({
      where: { id },
      data: dados,
    });

    return NextResponse.json(categoria);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar categoria" }, { status: 500 });
  }
}

// DELETE — Remove uma categoria (apenas se não tiver lançamentos vinculados)
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const existing = await prisma.categoriaFinanceira.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Verificar se tem lançamentos vinculados
    const count = await prisma.lancamentoFinanceiro.count({ where: { categoriaId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${count} lançamento(s) vinculado(s)` },
        { status: 409 }
      );
    }

    await prisma.categoriaFinanceira.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir categoria" }, { status: 500 });
  }
}
