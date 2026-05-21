import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Retorna o DRE consolidado (Receitas vs Despesas) para um período
export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mes = parseInt(searchParams.get("mes") || String(new Date().getMonth() + 1));
    const ano = parseInt(searchParams.get("ano") || String(new Date().getFullYear()));

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0);

    // 1. Buscar lançamentos do período agrupados por tipo e categoria
    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: {
        empresaId: sessao.empresaId,
        dataCompetencia: { gte: inicio, lte: fim },
        status: { not: "CANCELADO" },
      },
      include: {
        categoria: { select: { id: true, nome: true, tipo: true, grupo: true, cor: true, icone: true } },
      },
      orderBy: { dataVencimento: "asc" },
    });

    // 2. Buscar propostas PAGAS no período (receitas automáticas da Esteira)
    const propostasPagas = await prisma.proposta.aggregate({
      where: {
        empresaId: sessao.empresaId,
        status: "PAGA",
        pagaEm: { gte: inicio, lte: fim },
      },
      _sum: { valorComissao: true, valorLiberado: true },
      _count: true,
    });

    // 3. Calcular totais
    const totalReceitas = lancamentos
      .filter(l => l.tipo === "RECEITA")
      .reduce((acc, l) => acc + (l.status === "PAGO" ? (l.valorPago || l.valor) : l.valor), 0);

    const totalDespesas = lancamentos
      .filter(l => l.tipo === "DESPESA")
      .reduce((acc, l) => acc + (l.status === "PAGO" ? (l.valorPago || l.valor) : l.valor), 0);

    const totalImpostos = lancamentos
      .filter(l => l.tipo === "IMPOSTO")
      .reduce((acc, l) => acc + (l.status === "PAGO" ? (l.valorPago || l.valor) : l.valor), 0);

    const receitaComissoes = propostasPagas._sum.valorComissao || 0;
    const volumeLiberado = propostasPagas._sum.valorLiberado || 0;
    const qtdPropostasPagas = propostasPagas._count;

    const receitaTotal = totalReceitas + receitaComissoes;
    const lucroLiquido = receitaTotal - totalDespesas - totalImpostos;

    // 4. Agrupar despesas por categoria para o gráfico
    const despesasPorCategoria: Record<string, { nome: string; grupo: string | null; cor: string | null; total: number }> = {};
    lancamentos
      .filter(l => l.tipo === "DESPESA")
      .forEach(l => {
        const key = l.categoriaId;
        if (!despesasPorCategoria[key]) {
          despesasPorCategoria[key] = {
            nome: l.categoria.nome,
            grupo: l.categoria.grupo,
            cor: l.categoria.cor,
            total: 0,
          };
        }
        despesasPorCategoria[key].total += l.status === "PAGO" ? (l.valorPago || l.valor) : l.valor;
      });

    // 5. Contas vencidas (pendentes com data < hoje)
    const hoje = new Date();
    const vencidos = lancamentos.filter(
      l => l.status === "PENDENTE" && new Date(l.dataVencimento) < hoje
    );

    // 6. Buscar orçamentos do período para comparar (Budget Control)
    const orcamentos = await prisma.orcamentoDepartamento.findMany({
      where: { empresaId: sessao.empresaId, mes, ano },
      include: { categoria: { select: { id: true, nome: true } } },
    });

    const budgetStatus = orcamentos.map(orc => {
      const gasto = despesasPorCategoria[orc.categoriaId]?.total || 0;
      const percentual = orc.valorLimite > 0 ? (gasto / orc.valorLimite) * 100 : 0;
      return {
        categoriaId: orc.categoriaId,
        categoriaNome: orc.categoria.nome,
        limite: orc.valorLimite,
        gasto,
        percentual: Math.round(percentual * 100) / 100,
        alertaPercentual: orc.alertaPercentual,
        estourado: percentual >= 100,
        emAlerta: percentual >= orc.alertaPercentual,
        travaBloqueio: orc.travaBloqueio,
      };
    });

    return NextResponse.json({
      periodo: { mes, ano },
      resumo: {
        receitaComissoes,
        receitaOutras: totalReceitas,
        receitaTotal,
        totalDespesas,
        totalImpostos,
        lucroLiquido,
        margemLucro: receitaTotal > 0 ? Math.round((lucroLiquido / receitaTotal) * 10000) / 100 : 0,
        volumeLiberado,
        qtdPropostasPagas,
      },
      despesasPorCategoria: Object.values(despesasPorCategoria).sort((a, b) => b.total - a.total),
      vencidos: {
        quantidade: vencidos.length,
        valorTotal: vencidos.reduce((acc, l) => acc + l.valor, 0),
      },
      budgetStatus,
      lancamentos,
    });
  } catch (e) {
    console.error("Erro no DRE:", e);
    return NextResponse.json({ error: "Erro ao calcular DRE" }, { status: 500 });
  }
}
