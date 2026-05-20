import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RescisaoClient } from "./RescisaoClient";

export const metadata = { title: "Simulador de Rescisão | RH & Compliance | Kromuz" };

export default async function RescisaoPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId, status: "ATIVO", regimeContratacao: "CLT" },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, cpf: true, cargoFuncao: true, salarioBase: true, dataAdmissao: true, horasDiarias: true, horasSemanais: true },
  });

  return <RescisaoClient funcionarios={JSON.parse(JSON.stringify(funcionarios))} />;
}
