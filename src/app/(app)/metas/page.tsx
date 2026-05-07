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

  const [metas, equipe] = await Promise.all([
    prisma.meta.findMany({
      where: { empresaId: eid, ano: anoAtual },
      orderBy: [{ mes: "asc" }, { vendedorNome: "asc" }],
    }),
    prisma.usuarioPerfil.findMany({
      where: { empresaId: eid },
      select: { email: true, nome: true, perfilSlug: true },
    }),
  ]);

  return (
    <MetasClient
      metas={metas}
      equipe={equipe}
      mesAtual={mesAtual}
      anoAtual={anoAtual}
    />
  );
}
