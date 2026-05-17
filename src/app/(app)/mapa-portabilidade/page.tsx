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

  const regrasPort = await prisma.regraProdutoCredito.findMany({
    where: {
      empresaId: eid,
      ativa: true,
      tipoOperacao: { in: ["PORTABILIDADE", "PORTABILIDADE_REFIN"] },
    },
    select: {
      id: true,
      bancoNome: true,
      produtoNome: true,
      tipoOperacao: true,
      faixasEtarias: true,
      especies: true,
      portPermitido: true,
      refinPermitido: true,
      taxaMinimaAm: true,
      taxaMaximaAm: true,
      observacoes: true,
      banco: { select: { nome: true, codigoCompe: true } },
      produto: { select: { nomeProduto: true } },
    },
    orderBy: { banco: { nome: "asc" } },
  });

  const tabelasPort = await prisma.tabelaCoeficiente.findMany({
    where: {
      empresaId: eid,
      ativo: true,
      produto: {
        regras: {
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
      comissaoRepassePct: true,
      banco: { select: { nome: true } },
      produto: { select: { nomeProduto: true } },
    },
    orderBy: [{ taxaJurosMensal: "asc" }],
  });

  const propostasPort = await prisma.proposta.groupBy({
    by: ["bancoNome", "status"],
    where: {
      empresaId: eid,
      tipoOperacao: { in: ["PORTABILIDADE", "PORTABILIDADE_REFIN"] },
    },
    _count: true,
    _sum: { valorLiberado: true },
  });

  const seisAtras = new Date();
  seisAtras.setMonth(seisAtras.getMonth() - 6);

  const propostasMensais = await prisma.proposta.findMany({
    where: {
      empresaId: eid,
      tipoOperacao: { in: ["PORTABILIDADE", "PORTABILIDADE_REFIN"] },
      createdAt: { gte: seisAtras },
    },
    select: {
      bancoNome: true,
      status: true,
      valorLiberado: true,
      taxaJuros: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PortabilidadeClient
      regras={regrasPort as any}
      tabelas={tabelasPort}
      propostas={propostasPort}
      propostasMensais={propostasMensais as any}
    />
  );
}
