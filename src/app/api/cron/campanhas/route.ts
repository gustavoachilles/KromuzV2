import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Configurado para rodar a cada 1 minuto (ex: cron-job.org chamando https://kromuz.com/api/cron/campanhas)
export async function GET() {
  try {
    // 1. Pega todas as campanhas que estão RODANDO
    const campanhasAtivas = await prisma.campanha.findMany({
      where: { status: "RODANDO" },
      select: { id: true, empresaId: true, conteudoMensagem: true }
    });

    if (campanhasAtivas.length === 0) {
      return NextResponse.json({ ok: true, processados: 0, message: "Nenhuma campanha rodando" });
    }

    let mensagensEnviadas = 0;

    for (const campanha of campanhasAtivas) {
      // 2. Busca um lote de leads PENDENTES para essa campanha (ex: 20 leads por minuto = ~1 lead a cada 3s)
      const leadsParaEnviar = await prisma.campanhaLead.findMany({
        where: { campanhaId: campanha.id, statusEnvio: "PENDENTE" },
        take: 20,
        include: { lead: { select: { id: true, nome: true, telefone: true } } }
      });

      if (leadsParaEnviar.length === 0) {
        // Acabou a campanha
        await prisma.campanha.update({
          where: { id: campanha.id },
          data: { status: "CONCLUIDA" }
        });
        continue;
      }

      // Envia as mensagens e atualiza o status de cada lead
      for (const item of leadsParaEnviar) {
        try {
          const lead = item.lead;
          if (!lead.telefone) throw new Error("Sem telefone");

          // Substituir variáveis
          const texto = campanha.conteudoMensagem.replace(/{nome}/g, lead.nome.split(" ")[0]);

          // Mockando envio para o Evolution API (aqui entraria o fetch real)
          // await fetch('https://evolution-api.../sendText', { method: "POST", body: JSON.stringify({ number: lead.telefone, text: texto }) });
          
          // Registrar no Inbox também, como mensagem do SISTEMA
          const canal = await prisma.canalComunicacao.findFirst({
            where: { empresaId: campanha.empresaId, tipo: "WHATSAPP", ativo: true }
          });

          if (canal) {
            let conversa = await prisma.conversa.findFirst({
              where: { empresaId: campanha.empresaId, clienteContato: lead.telefone }
            });
            if (!conversa) {
              conversa = await prisma.conversa.create({
                data: { empresaId: campanha.empresaId, canalId: canal.id, clienteContato: lead.telefone, clienteNome: lead.nome, leadId: lead.id }
              });
            }
            await prisma.mensagem.create({
              data: { conversaId: conversa.id, remetente: "SISTEMA", conteudo: `[CAMPANHA] ${texto}` }
            });
          }

          // Marca como enviado
          await prisma.campanhaLead.update({
            where: { id: item.id },
            data: { statusEnvio: "ENVIADO" }
          });
          mensagensEnviadas++;

        } catch (err: any) {
          // Marca como falha
          await prisma.campanhaLead.update({
            where: { id: item.id },
            data: { statusEnvio: "FALHOU", erroLog: err.message }
          });
        }
      }
    }

    return NextResponse.json({ ok: true, mensagensEnviadas });
  } catch (error: any) {
    console.error("Erro no Cron de Campanhas:", error);
    return NextResponse.json({ error: "Erro interno no cron" }, { status: 500 });
  }
}
