import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FolhaClient } from "./FolhaClient";

export const metadata = { title: "Folha & Holerites | RH & Compliance | Kromuz" };

export default async function FolhaPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    select: { regimeTributario: true },
  });

  const funcionarios = await prisma.funcionario.findMany({
    where: {
      empresaId: sessao.empresaId,
      status: { in: ["ATIVO", "FERIAS"] },
      regimeContratacao: "CLT",
    },
    orderBy: { nome: "asc" },
  });

  return (
    <FolhaClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      regimeTributario={empresa?.regimeTributario || "SIMPLES_NACIONAL"}
    />
  );
}
