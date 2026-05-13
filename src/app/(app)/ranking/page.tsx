import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RankingClient } from "./RankingClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ranking | Kromuz",
  description: "Ranking gamificado de vendedores com metas e performance.",
};

export default async function RankingPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();
  const inicioMes = new Date(anoAtual, mesAtual - 1, 1);
  const fimMes = new Date(anoAtual, mesAtual, 0, 23, 59, 59);

  const [metas, propostasPagas, propostasDigitadas, leadsCriados, equipe] = await Promise.all([
    // Metas do mês atual
    prisma.meta.findMany({
      where: { empresaId: eid, mes: mesAtual, ano: anoAtual },
    }),
    // Propostas pagas do mês por vendedor
    prisma.proposta.groupBy({
      by: ["vendedorEmail"],
      where: {
        empresaId: eid,
        status: "PAGA",
        pagaEm: { gte: inicioMes, lte: fimMes },
      },
      _count: true,
      _sum: { valorLiberado: true, valorComissao: true },
    }),
    // Propostas digitadas (aguardando aprovação/pagamento)
    prisma.proposta.groupBy({
      by: ["vendedorEmail"],
      where: {
        empresaId: eid,
        status: "DIGITADA",
        digitadaEm: { gte: inicioMes, lte: fimMes },
      },
      _count: true,
    }),
    // Leads criados no mês por vendedor
    prisma.lead.groupBy({
      by: ["vendedorEmail"],
      where: {
        empresaId: eid,
        createdAt: { gte: inicioMes, lte: fimMes },
      },
      _count: true,
    }),
    // Equipe
    prisma.usuarioPerfil.findMany({
      where: { empresaId: eid },
      select: { email: true, nome: true, perfilSlug: true },
    })
  ]);

  return (
    <RankingClient
      metas={metas}
      propostasPagas={propostasPagas}
      propostasDigitadas={propostasDigitadas}
      leadsCriados={leadsCriados}
      equipe={equipe}
      mesAtual={mesAtual}
      anoAtual={anoAtual}
    />
  );
}
