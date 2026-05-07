import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RelatoriosClient } from "./RelatoriosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Relatórios | Kromuz",
  description: "Relatórios de performance da operação de crédito consignado.",
};

export default async function RelatoriosPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  const [
    propostasPorStatus,
    propostasPorTipo,
    totalPropostas,
    totalLeads,
    totalBancos,
    totalRegras,
  ] = await Promise.all([
    prisma.proposta.groupBy({
      by: ["status"],
      where: { empresaId: eid },
      _count: true,
      _sum: { valorLiberado: true, valorComissao: true },
    }),
    prisma.proposta.groupBy({
      by: ["tipoOperacao"],
      where: { empresaId: eid },
      _count: true,
      _sum: { valorLiberado: true },
    }),
    prisma.proposta.count({ where: { empresaId: eid } }),
    prisma.lead.count({ where: { empresaId: eid } }),
    prisma.banco.count({ where: { empresaId: eid, ativo: true } }),
    prisma.regraProdutoCredito.count({ where: { empresaId: eid, ativa: true } }),
  ]);

  return (
    <RelatoriosClient
      propostasPorStatus={propostasPorStatus}
      propostasPorTipo={propostasPorTipo}
      kpis={{ totalPropostas, totalLeads, totalBancos, totalRegras }}
    />
  );
}
