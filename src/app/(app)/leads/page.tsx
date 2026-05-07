import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LeadsClient } from "./LeadsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leads | Kromuz",
  description: "Gerencie seus leads de crédito consignado.",
};

export default async function LeadsPage() {
  const sessao = await getSessionEmpresa();

  const [leads, contagens] = await Promise.all([
    prisma.lead.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { empresaId: sessao.empresaId },
      _count: true,
    }),
  ]);

  return <LeadsClient leads={leads} contagens={contagens} />;
}
