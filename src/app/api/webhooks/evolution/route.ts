import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AutomationEngine } from "@/lib/automations/engine";

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

    // --- NOVA INTEGRAÇÃO: AUTOMATION ENGINE ---

    // 1. Verifica se já existe um fluxo rodando para esse lead
    const execucaoAtiva = await prisma.execucaoFluxo.findFirst({
      where: { leadId: lead.id, empresaId, status: "RODANDO" }
    });

    if (execucaoAtiva) {
      // Se o fluxo estiver esperando uma condição, a gente injeta o texto recebido e avança
      await prisma.execucaoFluxo.update({
        where: { id: execucaoAtiva.id },
        data: { variaveis: { ...execucaoAtiva.variaveis as object, textoRecebido } }
      });
      await AutomationEngine.avancarFluxo(execucaoAtiva.id);
      return NextResponse.json({ success: true, message: "Fluxo existente avançado" });
    }

    // 2. Se não tem execução rodando, buscar fluxo ativo para Gatilho "NOVA_MENSAGEM"
    const fluxoAtivo = await prisma.automacaoFluxo.findFirst({
      where: { empresaId, ativo: true, gatilhoTipo: "Nova Mensagem (WhatsApp)" }
    });

    if (fluxoAtivo) {
      // Inicia o fluxo visual criado no construtor
      await AutomationEngine.iniciarFluxo(fluxoAtivo.id, lead.id, { empresaId, textoRecebido });
      return NextResponse.json({ success: true, message: "Fluxo inicializado" });
    }

    // 3. (Fallback) Se não houver fluxo configurado, registrar a mensagem apenas no Inbox
    const canal = await prisma.canalComunicacao.findFirst({
      where: { empresaId, tipo: "WHATSAPP", ativo: true }
    });
    
    if (canal) {
      let conversa = await prisma.conversa.findFirst({
        where: { empresaId, clienteContato: telefone }
      });
      if (!conversa) {
        conversa = await prisma.conversa.create({
          data: { empresaId, canalId: canal.id, clienteContato: telefone, clienteNome: lead.nome, leadId: lead.id }
        });
      }
      await prisma.mensagem.create({
        data: { conversaId: conversa.id, remetente: "LEAD", conteudo: textoRecebido }
      });
    }

    return NextResponse.json({ success: true, fallback: true });
  } catch (error: any) {
    console.error("Erro no Webhook Evolution:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
