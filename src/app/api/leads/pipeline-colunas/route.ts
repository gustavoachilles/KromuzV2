import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { nome, cor } = body;

    if (!nome) return Response.json({ error: "Nome obrigatório" }, { status: 400 });

    // Pega a maior ordem atual para colocar no final
    const ultima = await prisma.pipelineColuna.findFirst({
      where: { empresaId: sessao.empresaId },
      orderBy: { ordem: "desc" },
    });
    
    const novaOrdem = ultima ? ultima.ordem + 1 : 0;

    const coluna = await prisma.pipelineColuna.create({
      data: {
        empresaId: sessao.empresaId,
        nome: nome.toUpperCase(),
        cor: cor || "bg-zinc-500",
        ordem: novaOrdem,
      }
    });

    return Response.json(coluna);
  } catch (e: any) {
    return Response.json({ error: "Erro interno do servidor" }, { status: 400 });
  }
}
