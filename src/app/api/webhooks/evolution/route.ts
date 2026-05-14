import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Formato típico de payload da Evolution API
    // { event: "messages.upsert", data: { messages: [ { key: { remoteJid }, message: { conversation } } ] } }
    if (data.event !== "messages.upsert") {
      return NextResponse.json({ received: true });
    }

    const msgData = data.data?.messages?.[0];
    if (!msgData || msgData.key.fromMe) {
      return NextResponse.json({ received: true }); // Ignora mensagens enviadas pelo próprio bot
    }

    const telefone = msgData.key.remoteJid?.split("@")[0];
    const textoRecebido = msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || "";

    if (!telefone || !textoRecebido) return NextResponse.json({ received: true });

    // Encontra a empresa atrelada a este webhook (na vida real, viria via query string ex: ?empresaId=123)
    const empresaId = req.nextUrl.searchParams.get("empresaId");
    if (!empresaId) return NextResponse.json({ error: "Empresa ID não fornecido" }, { status: 400 });

    // Localizar ou criar Lead
    let lead = await prisma.lead.findFirst({
      where: { empresaId, telefone: { contains: telefone.substring(2) } } // Remove DDI
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          empresaId,
          nome: "Novo Contato (WhatsApp)",
          telefone: telefone,
          origem: "WHATSAPP_BOT",
          status: "NOVO"
        }
      });
    }

    // Se o lead já tem um vendedor (atendimento humano em curso), não deixamos o bot responder
    if (lead.vendedorEmail) {
      return NextResponse.json({ received: true, ignored: "Lead já possui atendimento humano." });
    }

    // Passar para o Gemini atuar como Atendente de Triagem
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Você é a assistente virtual de uma correspondente bancária (Kromuz).
      O cliente enviou a seguinte mensagem no WhatsApp: "${textoRecebido}"
      
      Sua missão é fazer a triagem (Atendimento nível 1).
      Seja muito educada, curta e direta.
      Objetivo principal: Pedir o número do CPF ou uma foto do documento (RG/CNH) para podermos fazer uma simulação de margem no INSS.
      
      Não prometa valores, não fale de taxas. Apenas cumprimente, entenda a necessidade e peça o CPF/Documento.
      Se o cliente já mandou o CPF na mensagem, responda que vai consultar e já passa para um consultor humano.
    `;

    const result = await model.generateContent(prompt);
    const respostaBot = result.response.text();

    // Encontrar o canal do WhatsApp da empresa para vincular a conversa
    const canal = await prisma.canalComunicacao.findFirst({
      where: { empresaId, tipo: "WHATSAPP", ativo: true }
    });
    
    if (!canal) {
      return NextResponse.json({ error: "Canal de WhatsApp não configurado" }, { status: 400 });
    }

    // Salvar a conversa e as mensagens no banco
    let conversa = await prisma.conversa.findFirst({
      where: { empresaId, clienteContato: telefone }
    });

    if (!conversa) {
      conversa = await prisma.conversa.create({
        data: { 
          empresaId, 
          canalId: canal.id,
          clienteContato: telefone, 
          clienteNome: lead.nome,
          leadId: lead.id
        }
      });
    }

    // Mensagem do Lead
    await prisma.mensagem.create({
      data: { conversaId: conversa.id, remetente: "LEAD", conteudo: textoRecebido }
    });

    // Mensagem do Bot
    await prisma.mensagem.create({
      data: { conversaId: conversa.id, remetente: "SISTEMA", conteudo: respostaBot }
    });

    // TODO: Enviar a resposta de volta pelo endpoint da Evolution API
    // fetch('https://sua-evolution-api.com/message/sendText/InstanciaX', { ... body: { number: telefone, text: respostaBot } })

    return NextResponse.json({ success: true, resposta: respostaBot });
  } catch (error: any) {
    console.error("Erro no Webhook Evolution:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
