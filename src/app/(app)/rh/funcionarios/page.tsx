import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FuncionariosClient } from "./FuncionariosClient";

export const metadata = { title: "Funcionários | RH & Compliance | Kromuz" };

export default async function FuncionariosPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    select: { regimeTributario: true },
  });

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <FuncionariosClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      empresaId={sessao.empresaId}
      regimeTributario={empresa?.regimeTributario || "SIMPLES_NACIONAL"}
    />
  );
}
