import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SLAClient } from "./SLAClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SLA de WhatsApp | Kromuz",
  description: "Monitoramento de tempo de resposta da equipe de vendas.",
};

export default async function SLAPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  // Pegar conversas dos últimos 30 dias para análise de performance
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const conversas = await prisma.conversa.findMany({
    where: { 
      empresaId: eid,
      createdAt: { gte: trintaDiasAtras }
    },
    include: {
      vendedor: { select: { email: true, nome: true } },
      mensagens: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  // Agrupar por Vendedor
  const statsMap: Record<string, {
    vendedorNome: string;
    vendedorEmail: string;
    totalConversas: number;
    respondidas: number;
    somaTempoMinutos: number;
    vacuos: number;
  }> = {};

  conversas.forEach(conv => {
    // Só avaliar se tiver um vendedor atribuído
    if (!conv.vendedor) return;
    const vEmail = conv.vendedor.email;

    if (!statsMap[vEmail]) {
      statsMap[vEmail] = {
        vendedorNome: conv.vendedor.nome || vEmail,
        vendedorEmail: vEmail,
        totalConversas: 0,
        respondidas: 0,
        somaTempoMinutos: 0,
        vacuos: 0
      };
    }

    statsMap[vEmail].totalConversas++;

    // Achar primeira mensagem do lead e primeira do vendedor
    const primeiraLead = conv.mensagens.find(m => m.remetente === "LEAD");
    const primeiraVend = conv.mensagens.find(m => m.remetente === "VENDEDOR");

    if (primeiraLead && primeiraVend && primeiraVend.createdAt > primeiraLead.createdAt) {
      statsMap[vEmail].respondidas++;
      const diffMs = primeiraVend.createdAt.getTime() - primeiraLead.createdAt.getTime();
      const diffMin = diffMs / 1000 / 60;
      statsMap[vEmail].somaTempoMinutos += diffMin;
    } else if (primeiraLead && !primeiraVend) {
       // O lead mandou mensagem mas o vendedor NUNCA respondeu
       statsMap[vEmail].vacuos++;
    }
  });

  const rankingSla = Object.values(statsMap).map(s => {
    const tmr = s.respondidas > 0 ? Math.round(s.somaTempoMinutos / s.respondidas) : 0;
    return {
      vendedorNome: s.vendedorNome,
      vendedorEmail: s.vendedorEmail,
      totalConversas: s.totalConversas,
      taxaResposta: Math.round((s.respondidas / s.totalConversas) * 100) || 0,
      tmrMinutos: tmr,
      vacuos: s.vacuos
    };
  }).sort((a, b) => a.tmrMinutos - b.tmrMinutos); // Ordenar dos mais rápidos para os mais lentos

  return (
    <SLAClient ranking={rankingSla} />
  );
}
