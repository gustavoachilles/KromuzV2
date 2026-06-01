import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MesaClient } from "./MesaClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mesa do Operador | Kromuz",
  description: "Painel operacional de portabilidade — propostas, saldos e follow-ups.",
};

export default async function MesaPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  // Todas as propostas ativas (não pagas/canceladas)
  const propostas = await prisma.proposta.findMany({
    where: {
      empresaId: eid,
      status: { notIn: ["PAGA", "CANCELADA"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Leads com follow-up hoje
  const leadsHoje = await prisma.lead.findMany({
    where: {
      empresaId: eid,
      proximoContato: { gte: hoje, lt: amanha },
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
      status: true,
      vendedorNome: true,
      proximoContato: true,
      observacoes: true,
    },
    orderBy: { proximoContato: "asc" },
    take: 20,
  });

  // KPIs rápidos
  const [totalPagas, volumeMes] = await Promise.all([
    prisma.proposta.count({
      where: {
        empresaId: eid,
        status: "PAGA",
        pagaEm: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
      },
    }),
    prisma.proposta.aggregate({
      where: {
        empresaId: eid,
        status: "PAGA",
        pagaEm: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
      },
      _sum: { valorLiberado: true, valorComissao: true },
    }),
  ]);
  // Últimas propostas digitadas (todas, incluindo pagas)
  const ultimasPropostas = await prisma.proposta.findMany({
    where: { empresaId: eid },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <MesaClient
      sessao={{
        nomeUsuario: sessao.nomeUsuario,
        nomeEmpresa: sessao.nomeEmpresa,
        isAdmin: sessao.perfilSlug === "admin" || sessao.perfilSlug === "gestor" || (sessao as any).isSuperAdmin
      }}
      propostas={propostas as any}
      leadsHoje={leadsHoje as any}
      ultimasPropostas={ultimasPropostas as any}
      kpis={{
        totalPagas,
        volumeMes: volumeMes._sum.valorLiberado || 0,
        comissaoMes: volumeMes._sum.valorComissao || 0,
      }}
    />
  );
}
