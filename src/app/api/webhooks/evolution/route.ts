import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Eventos da Evolution API
    const { event, instance, data } = payload;

    if (!event || !instance) {
      return NextResponse.json({ success: false, message: "Payload inválido" }, { status: 400 });
    }

    // 1. Procurar qual CanalComunicacao pertence essa instância
    const canal = await prisma.canalComunicacao.findFirst({
      where: { 
        identificador: instance,
        tipo: "WHATSAPP"
      }
    });

    if (!canal) {
      console.warn(`Webhook ignorado: Instância ${instance} não cadastrada no Kromuz.`);
      return NextResponse.json({ success: true });
    }

    // 2. Processar Nova Mensagem Recebida
    if (event === "messages.upsert") {
      const messageInfo = data.messages?.[0] || data.message; // Evolution v1 vs v2
      
      if (!messageInfo || messageInfo.key.fromMe) {
        // Ignora mensagens enviadas pelo próprio sistema (evitar loop)
        return NextResponse.json({ success: true });
      }

      const remoteJid = messageInfo.key.remoteJid;
      const pushName = messageInfo.pushName || remoteJid.split('@')[0];
      
      let textContent = "";
      if (messageInfo.message?.conversation) textContent = messageInfo.message.conversation;
      if (messageInfo.message?.extendedTextMessage) textContent = messageInfo.message.extendedTextMessage.text;
      
      if (!textContent && messageInfo.message?.imageMessage) textContent = "[Imagem Recebida]";
      if (!textContent && messageInfo.message?.audioMessage) textContent = "[Áudio Recebido]";

      if (!textContent) return NextResponse.json({ success: true }); // Ignora system messages

      // Procurar ou criar a Conversa (Lead)
      let conversa = await prisma.conversa.findFirst({
        where: {
          canalId: canal.id,
          clienteContato: remoteJid
        }
      });

      if (!conversa) {
        conversa = await prisma.conversa.create({
          data: {
            empresaId: canal.empresaId,
            canalId: canal.id,
            clienteNome: pushName,
            clienteContato: remoteJid,
            status: "ABERTO",
            ultimaMensagem: textContent
          }
        });
      } else {
        await prisma.conversa.update({
          where: { id: conversa.id },
          data: { 
            ultimaMensagem: textContent,
            lida: false,
            updatedAt: new Date()
          }
        });
      }

      // Inserir a Mensagem
      await prisma.mensagem.create({
        data: {
          conversaId: conversa.id,
          remetente: "LEAD",
          conteudo: textContent,
          tipoConteudo: "TEXTO"
        }
      });

      // TODO: Acionar Pusher/Socket.io para atualizar o Frontend em tempo real (InboxDrawer)
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no Webhook Evolution:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
