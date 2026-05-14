import { prisma } from "@/lib/prisma";
import { sendEvolutionText } from "@/lib/evolution";

export async function runCampaign(campanhaId: string) {
  const campanha = await prisma.campanhaDisparo.findUnique({
    where: { id: campanhaId }
  });

  if (!campanha) return;

  const canal = await prisma.canalComunicacao.findUnique({
    where: { id: campanha.canalId }
  });

  if (!canal) return;

  // 1. Marcar como executando
  await prisma.campanhaDisparo.update({
    where: { id: campanhaId },
    data: { status: "EXECUTANDO" }
  });

  const filtros = campanha.filtrosDeBase as any;
  
  // 2. Buscar Leads
  const leads = await prisma.lead.findMany({
    where: {
      empresaId: campanha.empresaId,
      ...(filtros.status ? { status: filtros.status } : {}),
      telefone: { not: null }
    }
  });

  let sucessos = 0;
  const credenciais = canal.credenciaisApi as { apiUrl?: string, apiKey?: string };

  if (!credenciais?.apiUrl || !credenciais?.apiKey) {
    await prisma.campanhaDisparo.update({
      where: { id: campanhaId },
      data: { status: "CANCELADA" }
    });
    return;
  }

  // 3. Loop de Envio com Delay Anti-Ban
  for (const lead of leads) {
    try {
      const mensagemFinal = campanha.mensagemTemplate
        .replace("{nome}", lead.nome || "")
        .replace("{banco}", lead.bancoPreferido || "banco");

      await sendEvolutionText(
        credenciais.apiUrl,
        credenciais.apiKey,
        canal.identificador!,
        lead.telefone!,
        mensagemFinal
      );

      sucessos++;
      
      // Atualiza progresso
      await prisma.campanhaDisparo.update({
        where: { id: campanhaId },
        data: { leadsAtingidos: sucessos }
      });

      // Delay entre 10 e 25 segundos
      const delay = Math.floor(Math.random() * (25000 - 10000 + 1) + 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (err) {
      console.error(`Erro ao enviar para lead ${lead.id}:`, err);
    }
  }

  // 4. Concluir
  await prisma.campanhaDisparo.update({
    where: { id: campanhaId },
    data: { status: "CONCLUIDA" }
  });
}
