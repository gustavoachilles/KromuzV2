import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MarketingClient } from "./MarketingClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard de Marketing | Kromuz",
  description: "Análise de CAC, LTV e ROI de campanhas de tráfego pago.",
};

export default async function MarketingPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  // Busca todas as campanhas de marketing
  const campanhas = await prisma.campanhaMarketing.findMany({
    where: { empresaId: eid },
    include: {
      leads: {
        select: {
          id: true,
          valorLiberado: true,
        }
      }
    },
    orderBy: { dataInicio: "desc" }
  });

  const campanhasMapeadas = campanhas.map(camp => {
    const totalLeads = camp.leads.length;
    const clientesConvertidos = camp.leads.filter(l => l.valorLiberado && l.valorLiberado > 0).length;
    const volumeGerado = camp.leads.reduce((acc, l) => acc + (l.valorLiberado || 0), 0);
    const comissaoGerada = volumeGerado * 0.02; // estimativa

    const cac = clientesConvertidos > 0 ? camp.custoTotal / clientesConvertidos : 0;
    const cpl = totalLeads > 0 ? camp.custoTotal / totalLeads : 0;
    const roi = camp.custoTotal > 0 ? ((comissaoGerada - camp.custoTotal) / camp.custoTotal) * 100 : 0;

    return {
      id: camp.id,
      nome: camp.nome,
      origem: camp.origem,
      custoTotal: camp.custoTotal,
      dataInicio: camp.dataInicio,
      ativo: camp.ativo,
      metricas: {
        totalLeads,
        clientesConvertidos,
        comissaoGerada,
        volumeGerado,
        cac,
        cpl,
        roi
      }
    };
  });

  return (
    <MarketingClient campanhas={campanhasMapeadas} />
  );
}
