import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { getPlano, type PlanoSlug } from "@/lib/planos";
import { CreditCard } from "lucide-react";
import { AssinaturaClient } from "./AssinaturaClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha Assinatura | Kromuz",
};

export default async function AssinaturaPage() {
  const sessao = await getSessionEmpresa();

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    include: {
      faturasSaaS: {
        orderBy: { vencimento: 'desc' },
        take: 12
      },
      _count: {
        select: { usuarios: true, leads: true }
      }
    }
  });

  if (!empresa) return null;

  const planoSlug = empresa.planoSlug || "beta";
  const planoInfo = getPlano(planoSlug);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-brand" /> Minha Assinatura
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gerencie seu plano, limites e faturas.</p>
      </div>

      <AssinaturaClient
        planoSlug={planoSlug}
        planoInfo={{
          nome: planoInfo.nome,
          badge: planoInfo.badge,
          cor: planoInfo.cor,
          limiteUsuarios: planoInfo.limiteUsuarios === Infinity ? -1 : planoInfo.limiteUsuarios,
          limiteLeads: planoInfo.limiteLeads === Infinity ? -1 : planoInfo.limiteLeads,
          modulosPermitidos: planoInfo.modulosPermitidos,
        }}
        usuariosUsados={empresa._count.usuarios}
        leadsUsados={empresa._count.leads}
        statusAssinatura={empresa.statusAssinatura}
        faturas={empresa.faturasSaaS.map((f: any) => ({
          id: f.id,
          valor: f.valor,
          status: f.status,
          vencimento: f.vencimento.toISOString(),
          linkPagamento: f.linkPagamento,
        }))}
      />
    </div>
  );
}
