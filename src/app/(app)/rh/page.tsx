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

  return (
    <RhDashboardClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      regimeTributario={empresa?.regimeTributario || "SIMPLES_NACIONAL"}
      nomeEmpresa={empresa?.nomeEmpresa || ""}
    />
  );
}
