import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EsteiraClient } from "./EsteiraClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Esteira de Propostas | Kromuz",
  description: "Funil de propostas de crédito consignado.",
};

export default async function EsteiraPage() {
  const sessao = await getSessionEmpresa();

  const propostas = await prisma.proposta.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  // Contagens por status para o funil
  const contagens = await prisma.proposta.groupBy({
    by: ["status"],
    where: { empresaId: sessao.empresaId },
    _count: true,
    _sum: { valorLiberado: true },
  });

  // Tipos de operação distintos para filtro
  const tiposRaw = await prisma.proposta.groupBy({
    by: ["tipoOperacao"],
    where: { empresaId: sessao.empresaId },
    _count: true,
  });
  const tiposOperacao = tiposRaw
    .map(t => t.tipoOperacao)
    .filter(Boolean) as string[];

  const convenios = await prisma.convenio.findMany({
    where: { empresaId: sessao.empresaId },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" }
  });

  return <EsteiraClient propostas={propostas} contagens={contagens} tiposOperacao={tiposOperacao} convenios={convenios} />;
}
