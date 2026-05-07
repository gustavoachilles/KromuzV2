import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BancosClient } from "./BancosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bancos | Kromuz",
  description: "Gerencie os bancos parceiros e tabelas de coeficientes.",
};

export default async function BancosPage() {
  const sessao = await getSessionEmpresa();

  const bancos = await prisma.banco.findMany({
    where: { empresaId: sessao.empresaId },
    include: {
      _count: {
        select: {
          produtosCredito: true,
          tabelasCoeficiente: { where: { ativo: true } },
          regrasProduto: { where: { ativa: true } },
        },
      },
    },
    orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { nome: "asc" }],
  });

  return <BancosClient bancos={bancos} empresaId={sessao.empresaId} />;
}
