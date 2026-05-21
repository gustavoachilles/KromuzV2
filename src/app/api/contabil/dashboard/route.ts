import { NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Dados consolidados para Dashboard BI
export async function GET(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ano = parseInt(searchParams.get("ano") || String(new Date().getFullYear()));
    const empresaId = sessao.empresaId;

    // 1. Faturamento mensal (receitas vs despesas)
    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: { empresaId, dataCompetencia: { gte: new Date(ano, 0, 1), lte: new Date(ano, 11, 31) } },
      select: { tipo: true, valor: true, status: true, dataCompetencia: true, categoriaId: true },
    });

    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      label: new Date(ano, i).toLocaleDateString("pt-BR", { month: "short" }),
      receitas: 0, despesas: 0, impostos: 0, resultado: 0,
    }));

    lancamentos.forEach(l => {
      const m = l.dataCompetencia.getMonth();
      if (l.tipo === "RECEITA") meses[m].receitas += l.valor;
      else if (l.tipo === "DESPESA") meses[m].despesas += l.valor;
      else if (l.tipo === "IMPOSTO") meses[m].impostos += l.valor;
    });
    meses.forEach(m => m.resultado = m.receitas - m.despesas - m.impostos);

    // 2. Top categorias de despesa
    const catMap: Record<string, number> = {};
    lancamentos.filter(l => l.tipo === "DESPESA").forEach(l => {
      catMap[l.categoriaId] = (catMap[l.categoriaId] || 0) + l.valor;
    });
    const catIds = Object.keys(catMap);
    const categorias = await prisma.categoriaFinanceira.findMany({
      where: { id: { in: catIds } },
      select: { id: true, nome: true, cor: true },
    });
    const topDespesas = categorias
      .map(c => ({ nome: c.nome, cor: c.cor, valor: catMap[c.id] || 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    // 3. Fluxo de caixa (acumulado)
    let acumulado = 0;
    const fluxoCaixa = meses.map(m => {
      acumulado += m.resultado;
      return { mes: m.label, acumulado: Math.round(acumulado * 100) / 100 };
    });

    // 4. Status de contas
    const pendentes = lancamentos.filter(l => l.status === "PENDENTE" && l.tipo === "DESPESA");
    const vencidas = pendentes.filter(l => l.dataCompetencia < new Date());
    const totalPendente = pendentes.reduce((s, l) => s + l.valor, 0);
    const totalVencido = vencidas.reduce((s, l) => s + l.valor, 0);

    // 5. Totais do ano
    const totalReceitas = meses.reduce((s, m) => s + m.receitas, 0);
    const totalDespesas = meses.reduce((s, m) => s + m.despesas, 0);
    const totalImpostos = meses.reduce((s, m) => s + m.impostos, 0);
    const resultadoAno = totalReceitas - totalDespesas - totalImpostos;

    // 6. Carteira — volume de comissões
    const comissoes = await prisma.transacaoCarteira.aggregate({
      where: { empresaId, tipo: "CREDITO", createdAt: { gte: new Date(ano, 0, 1) } },
      _sum: { valor: true }, _count: true,
    });

    // 7. Patrimônio total
    const ativos = await prisma.ativoImobilizado.findMany({
      where: { empresaId, status: "ATIVO" },
      select: { valorAquisicao: true },
    });
    const patrimonioTotal = ativos.reduce((s, a) => s + a.valorAquisicao, 0);

    return NextResponse.json({
      ano, meses, topDespesas, fluxoCaixa,
      resumo: {
        totalReceitas, totalDespesas, totalImpostos, resultadoAno,
        totalPendente, totalVencido,
        comissoesTotal: comissoes._sum.valor || 0,
        comissoesCount: comissoes._count || 0,
        patrimonioTotal,
      },
    });
  } catch (e) {
    console.error("Erro dashboard:", e);
    return NextResponse.json({ error: "Erro ao gerar dashboard" }, { status: 500 });
  }
}
