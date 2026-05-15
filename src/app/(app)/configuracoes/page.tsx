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
        telefone: true,
        email: true,
        inscricaoEstadual: true,
        inscricaoMunicipal: true,
        cep: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        uf: true,
        createdAt: true,
      },
    }),
    prisma.usuarioPerfil.findMany({
      where: { empresaId: sessao.empresaId },
      select: {
        id: true,
        authUserId: true,
        email: true,
        nome: true,
        perfilSlug: true,
        ativo: true,
        avatarUrl: true,
        telefone: true, cpf: true, dataNascimento: true, rg: true, orgaoEmissor: true,
        genero: true, estadoCivil: true, timeFavorito: true,
        cep: true, logradouro: true, numero: true, complemento: true, bairro: true, cidade: true, uf: true,
        bancoNome: true, bancoAgencia: true, bancoConta: true, bancoTipoConta: true, chavePix: true, tipoChavePix: true,
        dataContratacao: true, dataDesligamento: true, observacoesPessoais: true,
        horarioInicio: true, horarioFim: true, diasAcesso: true,
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
