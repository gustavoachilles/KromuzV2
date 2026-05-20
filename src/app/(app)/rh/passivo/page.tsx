import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PassivoClient } from "./PassivoClient";

export const metadata = { title: "Passivo Trabalhista | RH & Compliance | Kromuz" };

export default async function PassivoPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    select: { regimeTributario: true },
  });

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId, status: { in: ["ATIVO", "FERIAS", "AFASTADO"] } },
    orderBy: { passivoEstimado: "desc" },
  });

  return (
    <PassivoClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      regimeTributario={empresa?.regimeTributario || "SIMPLES_NACIONAL"}
    />
  );
}
