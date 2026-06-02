import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function GET(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const promotoras = await prisma.promotora.findMany({
    where: { empresaId: sessao.empresaId, ativo: true },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(promotoras);
}
