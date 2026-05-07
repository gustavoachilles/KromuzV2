import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProdutosClient } from "./ProdutosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Produtos | Kromuz",
  description: "Gerencie os produtos de crédito consignado da sua operação.",
};

export default async function ProdutosPage() {
  const sessao = await getSessionEmpresa();

  const [produtos, bancos, convenios] = await Promise.all([
    prisma.produtoCredito.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      include: {
        banco: { select: { id: true, nome: true } },
        convenio: { select: { id: true, nome: true } },
        _count: {
          select: {
            tabelasCoeficiente: { where: { ativo: true } },
            regras: { where: { ativa: true } },
          },
        },
      },
      orderBy: [{ banco: { nome: "asc" } }, { nomeProduto: "asc" }],
    }),
    prisma.banco.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.convenio.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return <ProdutosClient produtos={produtos} bancos={bancos} convenios={convenios} />;
}
