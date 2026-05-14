import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Autenticação básica para CRON
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const diaAtual = hoje.getDate();

    // Buscar todas as empresas ativas
    const empresas = await prisma.empresa.findMany({ select: { id: true } });

    let leadsCriadosTotais = 0;

    for (const empresa of empresas) {
      // Como o Prisma não suporta funções EXTRACT(MONTH) nativamente, temos duas abordagens.
      // Como é CRON (backend pesado), faremos via raw query ou trazendo e filtrando (ruim para milhões).
      // Usaremos queryRaw
      
      const aniversariantes = await prisma.$queryRaw<any[]>`
        SELECT id, nome, telefone FROM leads 
        WHERE empresa_id = ${empresa.id}::uuid 
          AND EXTRACT(MONTH FROM data_nascimento) = ${mesAtual} 
          AND EXTRACT(DAY FROM data_nascimento) = ${diaAtual}
          AND telefone IS NOT NULL
      `;

      if (aniversariantes.length > 0) {
        // Encontra ou cria um canal padrão do WhatsApp
        const canal = await prisma.canalComunicacao.findFirst({
          where: { empresaId: empresa.id, tipo: "WHATSAPP", ativo: true }
        });

        if (canal) {
          // Cria uma campanha de disparo para hoje!
          const campanha = await prisma.campanhaDisparo.create({
            data: {
              empresaId: empresa.id,
              canalId: canal.id,
              nome: `🎂 Aniversariantes - ${diaAtual}/${mesAtual}`,
              mensagemTemplate: "Olá {nome}! A Kromuz deseja um feliz aniversário! 🥳 E como presente, liberamos uma simulação especial de margem para você com taxas reduzidas. Posso consultar?",
              status: "AGENDADA",
              dataAgendamento: hoje,
              contatosTotais: aniversariantes.length
            }
          });

          // (Na vida real, a trigger do banco ou worker inseriria os leads na fila de mensagens da campanha)
          leadsCriadosTotais += aniversariantes.length;
        }
      }
    }

    return NextResponse.json({ success: true, aniversariantesAgendados: leadsCriadosTotais });
  } catch (error: any) {
    console.error("Erro no CRON de Aniversários:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
