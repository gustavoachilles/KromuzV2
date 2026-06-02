import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { sendEvolutionText } from "@/lib/evolution";

export async function POST(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    const { conversaId, conteudo } = await req.json();

    if (!sessao.empresaId || !conversaId || !conteudo) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const conversa = await prisma.conversa.findUnique({
      where: { id: conversaId },
      include: { canal: true }
    });

    if (!conversa || conversa.empresaId !== sessao.empresaId) {
      return NextResponse.json({ error: "Conversa not found" }, { status: 404 });
    }

    // 1. Salva a mensagem no banco
    const mensagem = await prisma.mensagem.create({
      data: {
        conversaId,
        remetente: "VENDEDOR",
        conteudo,
        tipoConteudo: "TEXTO"
      }
    });

    // 2. Envia via Evolution API
    const credenciais = conversa.canal.credenciaisApi as { apiUrl?: string, apiKey?: string };
    
    if (credenciais?.apiUrl && credenciais?.apiKey) {
      try {
        await sendEvolutionText(
          credenciais.apiUrl,
          credenciais.apiKey,
          conversa.canal.identificador as string,
          conversa.clienteContato, // Número do cliente
          conteudo
        );
      } catch (evoErr) {
        console.error("Erro ao enviar pelo Evolution, mas mensagem foi salva no banco.", evoErr);
      }
    }

    // 3. Atualiza a última mensagem da conversa
    await prisma.conversa.update({
      where: { id: conversaId },
      data: { 
        ultimaMensagem: conteudo,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, mensagem });
  } catch (error: any) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
