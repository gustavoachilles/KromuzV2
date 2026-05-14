import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | Kromuz",
  description: "Visão geral da sua operação de crédito consignado.",
};

export default async function DashboardPage() {
  try {
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
    propostasStats,
    rankingVendedores,
    totalChunks,
    totalConversasAtivas,
    totalMensagensIA,
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
    // Dados Gráficos
    prisma.proposta.groupBy({
      by: ["status"],
      where: { empresaId: eid },
      _count: true,
      _sum: { valorLiberado: true, valorComissao: true },
    }),
    prisma.proposta.groupBy({
      by: ["vendedorNome"],
      where: { empresaId: eid, status: "PAGA" },
      _sum: { valorLiberado: true, valorComissao: true },
      orderBy: { _sum: { valorLiberado: "desc" } },
      take: 5,
    }),
    // NOVOS DADOS IA & OMNICHANNEL
    prisma.conhecimentoBevi.count(), // Cérebro RAG (Global)
    prisma.conversa.count({ where: { empresaId: eid, status: { not: "FECHADO" } } }),
    prisma.mensagem.count({ where: { remetente: "IA", conversa: { empresaId: eid } } }),
  ]);

  const volumeTotal = propostasStats.find(p => p.status === "PAGA")?._sum.valorLiberado || 0;
  const comissaoTotal = propostasStats.find(p => p.status === "PAGA")?._sum.valorComissao || 0;
  const funilData = [
    { name: "Leads Recebidos", value: totalLeads, fill: "var(--brand-primary)" },
    { name: "Propostas Digitadas", value: propostasStats.find(p => p.status === "DIGITADA")?._count || 0, fill: "#f59e0b" },
    { name: "Propostas Aprovadas", value: propostasStats.find(p => p.status === "APROVADA")?._count || 0, fill: "#3b82f6" },
    { name: "Propostas Pagas", value: propostasStats.find(p => p.status === "PAGA")?._count || 0, fill: "#10b981" },
  ];

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
        volumeTotal,
        comissaoTotal,
        totalChunks,
        totalConversasAtivas,
        totalMensagensIA,
      }}
      funilData={funilData}
      rankingVendedores={rankingVendedores}
      importacoesRecentes={importacoesRecentes}
      regrasPorTipo={regrasPorTipo}
    />
  );
  } catch (err: any) {
    if (err.message && err.message.includes("NEXT_REDIRECT")) {
      throw err; // Allow redirect to work
    }
    return (
      <div className="p-8 text-red-500 font-mono">
        <h1>ERRO INTERNO DETECTADO:</h1>
        <pre>{err.message || String(err)}</pre>
        <pre className="text-xs opacity-50 mt-4">{err.stack}</pre>
      </div>
    );
  }
}
