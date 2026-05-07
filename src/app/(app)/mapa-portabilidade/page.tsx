import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortabilidadeClient } from "./PortabilidadeClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mapa de Portabilidade | Kromuz",
  description: "Visualize oportunidades de portabilidade por banco e taxa.",
};

export default async function MapaPortabilidadePage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  // Regras de portabilidade ativas
  const regrasPort = await prisma.regraProdutoCredito.findMany({
    where: {
      empresaId: eid,
      ativa: true,
      tipoOperacao: { in: ["PORTABILIDADE", "PORTABILIDADE_REFIN"] },
    },
    include: {
      banco: { select: { nome: true, codigoCompe: true } },
      produto: { select: { nome: true } },
    },
    orderBy: { banco: { nome: "asc" } },
  });

  // Tabelas de port com taxas
  const tabelasPort = await prisma.tabelaCoeficiente.findMany({
    where: {
      empresaId: eid,
      ativo: true,
      produto: {
        regraProdutoCredito: {
          some: {
            tipoOperacao: { in: ["PORTABILIDADE", "PORTABILIDADE_REFIN"] },
            ativa: true,
          },
        },
      },
    },
    select: {
      id: true,
      nome: true,
      prazo: true,
      taxaJurosMensal: true,
      coeficiente: true,
      comissaoFlatPct: true,
      banco: { select: { nome: true } },
      produto: { select: { nome: true } },
    },
    orderBy: [{ taxaJurosMensal: "asc" }],
  });

  // Propostas de portabilidade
  const propostasPort = await prisma.proposta.groupBy({
    by: ["bancoNome", "status"],
    where: {
      empresaId: eid,
      tipoOperacao: { in: ["PORTABILIDADE", "PORTABILIDADE_REFIN"] },
    },
    _count: true,
    _sum: { valorLiberado: true },
  });

  return (
    <PortabilidadeClient
      regras={regrasPort}
      tabelas={tabelasPort}
      propostas={propostasPort}
    />
  );
}
