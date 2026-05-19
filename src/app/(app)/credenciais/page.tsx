import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CredenciaisClient } from "./CredenciaisClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Credenciais & Acessos | Kromuz",
  description: "Gerencie credenciais de acesso aos bancos, promotoras e sistemas.",
};

export default async function CredenciaisPage() {
  const sessao = await getSessionEmpresa();

  const bancos = await prisma.banco.findMany({
    where: { empresaId: sessao.empresaId, ativo: true },
    select: {
      id: true,
      nome: true,
      logoUrl: true,
      codigoCompe: true,
      permiteIntegracao: true,
      credenciaisApi: true,
    },
    orderBy: { nome: "asc" },
  });

  return <CredenciaisClient bancos={bancos} empresaId={sessao.empresaId} />;
}
