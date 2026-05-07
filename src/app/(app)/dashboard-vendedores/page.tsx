import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashVendedoresClient } from "./DashVendedoresClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard Vendedores | Kromuz",
  description: "Performance individual de cada vendedor.",
};

export default async function DashVendedoresPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

  const [equipe, propostasMes, leadsMes, metasMes] = await Promise.all([
    prisma.usuarioPerfil.findMany({
      where: { empresaId: eid },
      select: { email: true, nome: true, perfilSlug: true },
    }),
    prisma.proposta.groupBy({
      by: ["vendedorEmail", "status"],
      where: { empresaId: eid, createdAt: { gte: inicioMes, lte: fimMes } },
      _count: true,
      _sum: { valorLiberado: true, valorComissao: true },
    }),
    prisma.lead.groupBy({
      by: ["vendedorEmail", "status"],
      where: { empresaId: eid, createdAt: { gte: inicioMes, lte: fimMes } },
      _count: true,
    }),
    prisma.meta.findMany({
      where: { empresaId: eid, mes: agora.getMonth() + 1, ano: agora.getFullYear() },
    }),
  ]);

  return (
    <DashVendedoresClient
      equipe={equipe}
      propostasMes={propostasMes}
      leadsMes={leadsMes}
      metasMes={metasMes}
      mesLabel={agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
    />
  );
}
