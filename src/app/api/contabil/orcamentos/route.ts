import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Lista orçamentos de um mês/ano
export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mes = parseInt(searchParams.get("mes") || String(new Date().getMonth() + 1));
    const ano = parseInt(searchParams.get("ano") || String(new Date().getFullYear()));

    const orcamentos = await prisma.orcamentoDepartamento.findMany({
      where: { empresaId: sessao.empresaId, mes, ano },
      include: { categoria: { select: { id: true, nome: true, tipo: true, grupo: true } } },
      orderBy: { categoria: { nome: "asc" } },
    });

    return NextResponse.json(orcamentos);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar orçamentos" }, { status: 500 });
  }
}

// POST — Cria ou atualiza um orçamento (upsert)
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { categoriaId, mes, ano, valorLimite, alertaPercentual, travaBloqueio } = body;

    if (!categoriaId || !mes || !ano || valorLimite === undefined) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const orcamento = await prisma.orcamentoDepartamento.upsert({
      where: {
        empresaId_categoriaId_mes_ano: {
          empresaId: sessao.empresaId,
          categoriaId,
          mes,
          ano,
        },
      },
      update: {
        valorLimite,
        alertaPercentual: alertaPercentual ?? 80,
        travaBloqueio: travaBloqueio ?? false,
      },
      create: {
        empresaId: sessao.empresaId,
        categoriaId,
        mes,
        ano,
        valorLimite,
        alertaPercentual: alertaPercentual ?? 80,
        travaBloqueio: travaBloqueio ?? false,
      },
      include: { categoria: { select: { id: true, nome: true } } },
    });

    return NextResponse.json(orcamento, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar orçamento" }, { status: 500 });
  }
}

// DELETE — Remove um orçamento
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const existing = await prisma.orcamentoDepartamento.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    await prisma.orcamentoDepartamento.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir orçamento" }, { status: 500 });
  }
}
