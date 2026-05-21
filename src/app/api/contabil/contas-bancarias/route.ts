import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Lista todas as contas bancárias da empresa
export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const contas = await prisma.contaBancariaCF.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { nomeBanco: "asc" },
    });

    return NextResponse.json(contas);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar contas" }, { status: 500 });
  }
}

// POST — Cria uma nova conta bancária
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { nomeBanco, agencia, conta, tipoConta, chavePix, saldoInicial, cor } = body;

    if (!nomeBanco) {
      return NextResponse.json({ error: "Nome do banco é obrigatório" }, { status: 400 });
    }

    const contaBancaria = await prisma.contaBancariaCF.create({
      data: {
        empresaId: sessao.empresaId,
        nomeBanco,
        agencia,
        conta,
        tipoConta: tipoConta || "CORRENTE",
        chavePix,
        saldoInicial: saldoInicial || 0,
        cor,
      },
    });

    return NextResponse.json(contaBancaria, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
  }
}

// PUT — Atualiza uma conta bancária
export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, ...dados } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const contaBancaria = await prisma.contaBancariaCF.update({
      where: { id },
      data: dados,
    });

    return NextResponse.json(contaBancaria);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar conta" }, { status: 500 });
  }
}

// DELETE — Remove uma conta bancária
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const count = await prisma.lancamentoFinanceiro.count({ where: { contaBancariaId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${count} lançamento(s) vinculado(s)` },
        { status: 409 }
      );
    }

    await prisma.contaBancariaCF.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 });
  }
}
