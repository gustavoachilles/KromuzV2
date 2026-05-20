import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FeriasClient } from "./FeriasClient";

export const metadata = { title: "Gestão de Férias | RH & Compliance | Kromuz" };

export default async function FeriasPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const funcionarios = await prisma.funcionario.findMany({
    where: {
      empresaId: sessao.empresaId,
      status: { in: ["ATIVO", "FERIAS"] },
      regimeContratacao: "CLT",
    },
    include: {
      ferias: { orderBy: { periodoAquisitivoInicio: "desc" } },
    },
    orderBy: { nome: "asc" },
  });

  return (
    <FeriasClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      empresaId={sessao.empresaId}
    />
  );
}
