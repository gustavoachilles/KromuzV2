import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RegrasClient } from "./RegrasClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Regras de Crédito | Kromuz",
  description: "Visualize e edite as regras operacionais extraídas pela IA.",
};

export default async function RegrasPage({
  searchParams,
}: {
  searchParams: Promise<{ importacao?: string; banco?: string }>;
}) {
  const sessao = await getSessionEmpresa();
  const params = await searchParams;

  const where: any = { empresaId: sessao.empresaId };
  if (params.importacao) where.importacaoPdfId = params.importacao;
  if (params.banco) where.bancoId = params.banco;

  const regras = await prisma.regraProdutoCredito.findMany({
    where,
    include: {
      banco: { select: { id: true, nome: true } },
      produto: { select: { id: true, nomeProduto: true, tipoProduto: true } },
      importacaoPdf: { select: { id: true, nomeArquivo: true, createdAt: true } },
    },
    orderBy: [{ bancoNome: "asc" }, { tipoOperacao: "asc" }],
  });

  const bancos = await prisma.banco.findMany({
    where: { empresaId: sessao.empresaId, ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return <RegrasClient regras={regras} bancos={bancos} filtros={params} />;
}
