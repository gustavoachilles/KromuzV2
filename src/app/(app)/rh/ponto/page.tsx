import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PontoClient } from "./PontoClient";

export const metadata = { title: "Controle de Ponto | RH & Compliance | Kromuz" };

export default async function PontoPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId, status: "ATIVO", regimeContratacao: { not: "PJ" } },
    orderBy: { nome: "asc" },
    select: {
      id: true, nome: true, cargoFuncao: true, tipoJornada: true,
      horasDiarias: true, horasSemanais: true, regimeContratacao: true,
    },
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const registrosHoje = await prisma.registroPonto.findMany({
    where: {
      funcionario: { empresaId: sessao.empresaId },
      data: hoje,
    },
    include: { pausas: true },
  });

  return (
    <PontoClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      registrosHoje={JSON.parse(JSON.stringify(registrosHoje))}
      empresaId={sessao.empresaId}
    />
  );
}
