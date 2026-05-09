import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashFinanceiroClient } from "./DashFinanceiroClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard Financeiro | Kromuz",
  description: "Visão financeira consolidada da operação.",
};

export default async function DashFinanceiroPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;
  const agora = new Date();

  // Últimos 6 meses
  const mesesData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    mesesData.push({ inicio: d, fim, label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) });
  }

  const resultados = await Promise.all(
    mesesData.map(async (m) => {
      const agg = await prisma.proposta.aggregate({
        where: { empresaId: eid, status: "PAGA", pagaEm: { gte: m.inicio, lte: m.fim } },
        _sum: { valorLiberado: true, valorComissao: true, valorParcela: true },
        _count: true,
      });
      return {
        label: m.label,
        volume: agg._sum.valorLiberado || 0,
        comissao: agg._sum.valorComissao || 0,
        parcela: agg._sum.valorParcela || 0,
        count: agg._count,
      };
    })
  );

  // Por banco (top 10)
  const porBanco = await prisma.proposta.groupBy({
    by: ["bancoNome"],
    where: { empresaId: eid, status: "PAGA" },
    _sum: { valorLiberado: true, valorComissao: true },
    _count: true,
    orderBy: { _sum: { valorLiberado: "desc" } },
    take: 10,
  });

  // Totais gerais
  const totais = await prisma.proposta.aggregate({
    where: { empresaId: eid, status: "PAGA" },
    _sum: { valorLiberado: true, valorComissao: true },
    _count: true,
  });

  // Faturas Geradas
  const faturas = await prisma.faturaBanco.findMany({
    where: { empresaId: eid },
    include: { _count: { select: { propostas: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Propostas Pagas mas sem Fatura gerada (para gerar novo lote)
  const propostasPendentes = await prisma.proposta.findMany({
    where: { empresaId: eid, status: "PAGA", faturaBancoId: null },
    select: { id: true, bancoNome: true, valorComissao: true },
  });

  return (
    <DashFinanceiroClient
      meses={resultados}
      porBanco={porBanco}
      totais={{
        volume: totais._sum.valorLiberado || 0,
        comissao: totais._sum.valorComissao || 0,
        count: totais._count,
      }}
      faturasIniciais={faturas}
      pendentesIniciais={propostasPendentes}
    />
  );
}
