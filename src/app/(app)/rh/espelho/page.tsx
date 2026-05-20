import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EspelhoClient } from "./EspelhoClient";

export const metadata = { title: "Espelho de Ponto | RH & Compliance | Kromuz" };

export default async function EspelhoPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId, status: { in: ["ATIVO", "FERIAS"] }, regimeContratacao: { not: "PJ" } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, cargoFuncao: true, tipoJornada: true, horasDiarias: true, horasSemanais: true, salarioBase: true },
  });

  // Buscar registros do mês atual
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

  const registros = await prisma.registroPonto.findMany({
    where: {
      funcionario: { empresaId: sessao.empresaId },
      data: { gte: inicioMes, lte: fimMes },
    },
    include: { pausas: true },
    orderBy: { data: "asc" },
  });

  return (
    <EspelhoClient
      funcionarios={JSON.parse(JSON.stringify(funcionarios))}
      registros={JSON.parse(JSON.stringify(registros))}
      mesAtual={agora.getMonth() + 1}
      anoAtual={agora.getFullYear()}
    />
  );
}
