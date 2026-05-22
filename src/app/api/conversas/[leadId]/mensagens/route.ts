import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export async function GET(req: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const sessao = await getSessionEmpresa();
    const { leadId } = await context.params;

    if (!sessao.empresaId || !leadId) {
      return NextResponse.json({ error: "Unauthorized or missing params" }, { status: 400 });
    }

    // Busca a conversa associada ao lead
    const conversa = await prisma.conversa.findFirst({
      where: {
        leadId: leadId,
        empresaId: sessao.empresaId
      },
      include: {
        canal: true
      }
    });

    if (!conversa) {
      return NextResponse.json({ mensagens: [], conversaId: null });
    }

    // Busca o histórico de mensagens
    const mensagens = await prisma.mensagem.findMany({
      where: { conversaId: conversa.id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ 
      mensagens, 
      conversaId: conversa.id,
      canal: {
        nomeCanal: conversa.canal.nomeCanal,
        botAtivo: conversa.canal.botAtivo
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar mensagens:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
