import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RoteirosClient } from "./RoteirosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Roteiros Operacionais | Kromuz",
  description: "Histórico de PDFs importados e regras extraídas.",
};

export default async function RoteirosPage() {
  const sessao = await getSessionEmpresa();

  const importacoes = await prisma.importacaoPDF.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { regrasGeradas: true } },
    },
  });

  const totalRegras = await prisma.regraProdutoCredito.count({
    where: { empresaId: sessao.empresaId, ativa: true },
  });

  return (
    <RoteirosClient
      importacoes={importacoes}
      totalRegras={totalRegras}
      empresaId={sessao.empresaId}
    />
  );
}
