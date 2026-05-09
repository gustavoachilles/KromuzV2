import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configurações | Kromuz",
  description: "Gerencie os dados da sua empresa e equipe.",
};

export default async function ConfiguracoesPage() {
  const sessao = await getSessionEmpresa();

  const [empresa, usuarios, bancos] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: sessao.empresaId },
      select: {
        id: true,
        nomeEmpresa: true,
        nomeFantasia: true,
        cpfCnpj: true,
        status: true,
        planoSlug: true,
        diasTrial: true,
        dataTrialFim: true,
        logoUrl: true,
        corPrimaria: true,
        createdAt: true,
      },
    }),
    prisma.usuarioPerfil.findMany({
      where: { empresaId: sessao.empresaId },
      select: {
        id: true,
        email: true,
        nome: true,
        perfilSlug: true,
        ativo: true,
        createdAt: true,
      },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    }),
    prisma.banco.findMany({
      where: { empresaId: sessao.empresaId },
      select: {
        id: true,
        nome: true,
        logoUrl: true,
        permiteIntegracao: true,
        credenciaisApi: true
      },
      orderBy: { nome: "asc" }
    })
  ]);

  return (
    <ConfiguracoesClient
      empresa={empresa!}
      usuarios={usuarios}
      bancos={bancos}
      sessao={{
        userId: sessao.userId,
        perfilSlug: sessao.perfilSlug,
      }}
    />
  );
}
