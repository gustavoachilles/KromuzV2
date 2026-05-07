import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// GET /api/roteiros — lista importações PDF (histórico de roteiros processados)
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const importacoes = await prisma.importacaoPDF.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      regrasGeradas: {
        select: { id: true, tipoOperacao: true, produtoNome: true, bancoNome: true },
      },
    },
  });

  return Response.json(importacoes);
}
