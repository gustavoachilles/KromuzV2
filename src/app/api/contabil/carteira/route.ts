import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Resumo de saldos de TODOS os vendedores (visão gerencial)
//        Ou extrato de um vendedor específico se ?email=xxx
export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (email) {
      // Extrato individual do vendedor
      const transacoes = await prisma.transacaoCarteira.findMany({
        where: { empresaId: sessao.empresaId, vendedorEmail: email },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const creditos = transacoes.filter(t => t.tipo === "CREDITO").reduce((s, t) => s + t.valor, 0);
      const debitos = transacoes.filter(t => t.tipo === "DEBITO").reduce((s, t) => s + t.valor, 0);
      const saldo = creditos - debitos;

      return NextResponse.json({
        vendedorEmail: email,
        vendedorNome: transacoes[0]?.vendedorNome || email,
        creditos,
        debitos,
        saldo,
        transacoes,
      });
    }

    // Visão gerencial — saldos de todos os vendedores
    const transacoes = await prisma.transacaoCarteira.findMany({
      where: { empresaId: sessao.empresaId },
      select: { vendedorEmail: true, vendedorNome: true, tipo: true, valor: true, statusPagamento: true },
    });

    // Agrupar por vendedor
    const map: Record<string, { nome: string; creditos: number; debitos: number; pendentePagamento: number }> = {};
    transacoes.forEach(t => {
      if (!map[t.vendedorEmail]) {
        map[t.vendedorEmail] = { nome: t.vendedorNome || t.vendedorEmail, creditos: 0, debitos: 0, pendentePagamento: 0 };
      }
      if (t.tipo === "CREDITO") {
        map[t.vendedorEmail].creditos += t.valor;
        if (t.statusPagamento === "PENDENTE") map[t.vendedorEmail].pendentePagamento += t.valor;
      } else {
        map[t.vendedorEmail].debitos += t.valor;
      }
    });

    const vendedores = Object.entries(map).map(([email, data]) => ({
      email,
      nome: data.nome,
      creditos: data.creditos,
      debitos: data.debitos,
      saldo: data.creditos - data.debitos,
      pendentePagamento: data.pendentePagamento,
    })).sort((a, b) => b.saldo - a.saldo);

    // Buscar dados bancários dos vendedores
    const perfis = await prisma.usuarioPerfil.findMany({
      where: { empresaId: sessao.empresaId, email: { in: vendedores.map(v => v.email) } },
      select: { email: true, chavePix: true, bancoNome: true, bancoAgencia: true, bancoConta: true },
    });
    const perfilMap = Object.fromEntries(perfis.map(p => [p.email, p]));

    const resultado = vendedores.map(v => ({
      ...v,
      dadosBancarios: perfilMap[v.email] || null,
    }));

    return NextResponse.json(resultado);
  } catch (e) {
    console.error("Erro carteira:", e);
    return NextResponse.json({ error: "Erro ao buscar carteira" }, { status: 500 });
  }
}

// POST — Criar transação manual (débito ou crédito)
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { vendedorEmail, vendedorNome, tipo, categoria, descricao, valor, propostaId, bancoNome, observacoes } = body;

    if (!vendedorEmail || !tipo || !categoria || !descricao || !valor) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const transacao = await prisma.transacaoCarteira.create({
      data: {
        empresaId: sessao.empresaId,
        vendedorEmail,
        vendedorNome,
        tipo,         // CREDITO ou DEBITO
        categoria,    // COMISSAO, ESTORNO, VALE, ADIANTAMENTO, DESCONTO_INSS, MULTA, SAQUE, AJUSTE
        descricao,
        valor: Math.abs(valor),
        propostaId: propostaId || null,
        bancoNome: bancoNome || null,
        observacoes: observacoes || null,
        criadoPor: sessao.email,
      },
    });

    return NextResponse.json(transacao, { status: 201 });
  } catch (e) {
    console.error("Erro ao criar transação:", e);
    return NextResponse.json({ error: "Erro ao criar transação" }, { status: 500 });
  }
}

// DELETE — Excluir uma transação
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    await prisma.transacaoCarteira.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
