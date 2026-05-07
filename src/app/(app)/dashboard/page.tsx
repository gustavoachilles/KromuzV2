import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | Kromuz",
  description: "Visão geral da sua operação de crédito consignado.",
};

export default async function DashboardPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  const [
    totalBancos,
    totalBancosSimulacao,
    totalProdutos,
    totalTabelas,
    totalRegras,
    totalConvenios,
    totalImportacoes,
    importacoesOk,
    importacoesRecentes,
    regrasPorTipo,
    totalLeads,
    totalPropostas,
    totalPropostasPagas,
  ] = await Promise.all([
    prisma.banco.count({ where: { empresaId: eid, ativo: true } }),
    prisma.banco.count({ where: { empresaId: eid, ativo: true, ativoSimulacao: true } }),
    prisma.produtoCredito.count({ where: { empresaId: eid, ativo: true } }),
    prisma.tabelaCoeficiente.count({ where: { empresaId: eid, ativo: true } }),
    prisma.regraProdutoCredito.count({ where: { empresaId: eid, ativa: true } }),
    prisma.convenio.count({ where: { empresaId: eid, ativo: true } }),
    prisma.importacaoPDF.count({ where: { empresaId: eid } }),
    prisma.importacaoPDF.count({ where: { empresaId: eid, status: "concluido" } }),
    prisma.importacaoPDF.findMany({
      where: { empresaId: eid },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        nomeArquivo: true,
        status: true,
        createdAt: true,
        _count: { select: { regrasGeradas: true } },
      },
    }),
    prisma.regraProdutoCredito.groupBy({
      by: ["tipoOperacao"],
      where: { empresaId: eid, ativa: true },
      _count: true,
    }),
    prisma.lead.count({ where: { empresaId: eid } }),
    prisma.proposta.count({ where: { empresaId: eid } }),
    prisma.proposta.count({ where: { empresaId: eid, status: "PAGA" } }),
  ]);

  return (
    <DashboardClient
      sessao={{
        nomeUsuario: sessao.nomeUsuario,
        nomeEmpresa: sessao.nomeEmpresa,
      }}
      kpis={{
        totalBancos,
        totalBancosSimulacao,
        totalProdutos,
        totalTabelas,
        totalRegras,
        totalConvenios,
        totalImportacoes,
        importacoesOk,
        totalLeads,
        totalPropostas,
        totalPropostasPagas,
      }}
      importacoesRecentes={importacoesRecentes}
      regrasPorTipo={regrasPorTipo}
    />
  );
}
