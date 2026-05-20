import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RhDashboardClient } from "./RhDashboardClient";

export const metadata = { title: "Dashboard RH & Compliance | Kromuz" };

export default async function RhDashboardPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    select: { regimeTributario: true, nomeEmpresa: true },
  });

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
  });

  // Férias agendadas/em gozo
  const ferias = await prisma.feriasFuncionario.findMany({
    where: {
      funcionario: { empresaId: sessao.empresaId },
      status: { in: ["AGENDADA", "EM_GOZO"] },
    },
    select: { funcionarioId: true, dataInicio: true, dataFim: true, status: true, periodoConcessivoFim: true },
  });

  // Propostas pagas dos últimos 3 meses (para ROI)
  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
  const propostas = await prisma.proposta.groupBy({
    by: ["vendedorEmail"],
    where: { empresaId: sessao.empresaId, status: "PAGA", pagaEm: { gte: tresMesesAtras } },
    _sum: { valorComissao: true, valorLiberado: true },
    _count: true,
  });

  return (
    <RhDashboardClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      ferias={JSON.parse(JSON.stringify(ferias))}
      propostas={JSON.parse(JSON.stringify(propostas))}
      regimeTributario={empresa?.regimeTributario || "SIMPLES_NACIONAL"}
      nomeEmpresa={empresa?.nomeEmpresa || ""}
    />
  );
}
