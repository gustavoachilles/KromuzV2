import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ComissoesClient } from "./ComissoesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Comissões | Kromuz",
  description: "Gestão de comissões sobre propostas de crédito consignado.",
};

export default async function ComissoesPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  // Propostas PAGAS e APROVADAS com comissão
  const propostas = await prisma.proposta.findMany({
    where: {
      empresaId: eid,
      status: { in: ["PAGA", "APROVADA"] },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Tabelas com comissão para referência
  const tabelas = await prisma.tabelaCoeficiente.findMany({
    where: {
      empresaId: eid,
      ativo: true,
      comissaoFlatPct: { not: null },
    },
    select: {
      id: true,
      nome: true,
      comissaoFlatPct: true,
      comissaoRepassePct: true,
      banco: { select: { nome: true } },
    },
    orderBy: { nome: "asc" },
  });

  // Totais
  const totais = await prisma.proposta.aggregate({
    where: {
      empresaId: eid,
      status: "PAGA",
    },
    _sum: { valorLiberado: true, valorComissao: true },
    _count: true,
  });

  return (
    <ComissoesClient
      propostas={propostas}
      tabelas={tabelas}
      totais={{
        count: totais._count,
        valorLiberado: totais._sum.valorLiberado || 0,
        valorComissao: totais._sum.valorComissao || 0,
      }}
    />
  );
}
