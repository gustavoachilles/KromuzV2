import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LeadsClient } from "./LeadsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leads | Kromuz",
  description: "Gerencie seus leads de crédito consignado.",
};

export default async function LeadsPage() {
  const sessao = await getSessionEmpresa();

  // Busca colunas do pipeline para a empresa
  let colunas = await prisma.pipelineColuna.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { ordem: "asc" },
  });

  // Se for a primeira vez, cria as colunas padrão
  if (colunas.length === 0) {
    const padroes = [
      { nome: "NOVO", cor: "bg-blue-500", ordem: 0 },
      { nome: "CONTATO", cor: "bg-yellow-500", ordem: 1 },
      { nome: "QUALIFICADO", cor: "bg-purple-500", ordem: 2 },
      { nome: "PROPOSTA", cor: "bg-orange-500", ordem: 3 },
      { nome: "APROVADO", cor: "bg-emerald-500", ordem: 4 },
      { nome: "PAGO", cor: "bg-violet-500", ordem: 5 },
      { nome: "PERDIDO", cor: "bg-red-500", ordem: 6 },
    ];
    await prisma.pipelineColuna.createMany({
      data: padroes.map((p) => ({ ...p, empresaId: sessao.empresaId })),
    });
    colunas = await prisma.pipelineColuna.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { ordem: "asc" },
    });
  }

  const [leads, contagens] = await Promise.all([
    prisma.lead.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { empresaId: sessao.empresaId },
      _count: true,
    }),
  ]);

  return <LeadsClient leads={leads} contagens={contagens} colunas={colunas} />;
}
