import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { sendEvolutionText } from "@/lib/evolution";

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

      // LÓGICA DE INTELIGÊNCIA ARTIFICIAL (Bot Ativo)
      if (canal.botAtivo && canal.promptBase) {
        try {
          // Busca histórico recente para contexto da IA
          const historico = await prisma.mensagem.findMany({
            where: { conversaId: conversa.id },
            orderBy: { createdAt: 'asc' },
            take: 10
          });

          const messages = historico.map(m => ({
            role: m.remetente === "LEAD" ? "user" : "assistant",
            content: m.conteudo
          }));

          const systemPrompt = `Você é um assistente de atendimento por WhatsApp. 
Regras base:
${canal.promptBase}

Informações do Lead:
Nome: ${pushName}
Número: ${remoteJid}
Aja de forma natural e prestativa.`;

          const { text: iaResponse } = await generateText({
            model: google('models/gemini-1.5-pro-latest'),
            system: systemPrompt,
            messages: messages as any
          });

          if (iaResponse) {
            // Salva a resposta da IA no banco
            await prisma.mensagem.create({
              data: {
                conversaId: conversa.id,
                remetente: "IA",
                conteudo: iaResponse,
                tipoConteudo: "TEXTO"
              }
            });

            // Envia de volta para o cliente via Evolution API
            const credenciais = canal.credenciaisApi as { apiUrl?: string, apiKey?: string };
            if (credenciais?.apiUrl && credenciais?.apiKey) {
              await sendEvolutionText(
                credenciais.apiUrl, 
                credenciais.apiKey, 
                canal.identificador as string, 
                remoteJid, 
                iaResponse
              );
            }
          }
        } catch (iaError) {
          console.error("Erro ao gerar/enviar resposta da IA:", iaError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no Webhook Evolution:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
