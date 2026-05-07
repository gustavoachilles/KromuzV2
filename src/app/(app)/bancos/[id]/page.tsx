import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BancoDetalheClient } from "./BancoDetalheClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Banco ${id.slice(0, 8)} | Kromuz` };
}

export default async function BancoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessionEmpresa();
  const { id } = await params;

  const banco = await prisma.banco.findFirst({
    where: { id, empresaId: sessao.empresaId },
    include: {
      produtosCredito: {
        where: { ativo: true },
        orderBy: { nomeProduto: "asc" },
      },
      tabelasCoeficiente: {
        where: { ativo: true },
        orderBy: [{ nome: "asc" }, { prazo: "asc" }],
        include: {
          produto: { select: { nomeProduto: true, tipoProduto: true } },
        },
      },
      regrasProduto: {
        where: { ativa: true },
        select: { id: true, tipoOperacao: true, produtoNome: true, versaoRoteiro: true },
        orderBy: { tipoOperacao: "asc" },
      },
    },
  });

  if (!banco) notFound();

  return <BancoDetalheClient banco={banco} empresaId={sessao.empresaId} />;
}
