import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MetasClient } from "./MetasClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Metas | Kromuz",
  description: "Defina metas mensais para sua equipe de vendas.",
};

export default async function MetasPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();

  const [metas, equipe, producaoRaw] = await Promise.all([
    prisma.meta.findMany({
      where: { empresaId: eid, ano: anoAtual },
      orderBy: [{ mes: "asc" }, { vendedorNome: "asc" }],
    }),
    prisma.usuarioPerfil.findMany({
      where: { empresaId: eid },
      select: { email: true, nome: true, perfilSlug: true },
    }),
    // Busca todas as propostas pagas do ano atual para cruzar com as metas dos meses correspondentes
    prisma.proposta.findMany({
      where: { 
        empresaId: eid, 
        status: "PAGA",
        pagaEm: {
          gte: new Date(anoAtual, 0, 1),
          lte: new Date(anoAtual, 11, 31, 23, 59, 59)
        }
      },
      select: { vendedorEmail: true, valorLiberado: true, pagaEm: true }
    })
  ]);

  // Agrupa a produção por [mes][vendedorEmail]
  const producao: Record<number, Record<string, { propostas: number; volume: number }>> = {};
  
  producaoRaw.forEach(p => {
    if (!p.pagaEm || !p.vendedorEmail) return;
    const m = p.pagaEm.getMonth() + 1; // 1 a 12
    const v = p.vendedorEmail;

    if (!producao[m]) producao[m] = {};
    if (!producao[m][v]) producao[m][v] = { propostas: 0, volume: 0 };

    producao[m][v].propostas += 1;
    producao[m][v].volume += p.valorLiberado || 0;
  });

  return (
    <MetasClient
      metas={metas}
      equipe={equipe}
      producao={producao}
      mesAtual={mesAtual}
      anoAtual={anoAtual}
    />
  );
}
