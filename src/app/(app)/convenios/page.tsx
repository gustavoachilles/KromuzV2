import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ConveniosClient } from "./ConveniosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Convênios | Kromuz",
  description: "Gerencie os convênios (INSS, SIAPE, Forças Armadas, etc.) da sua operação.",
};

export default async function ConveniosPage() {
  const sessao = await getSessionEmpresa();

  const [convenios, bancos] = await Promise.all([
    prisma.convenio.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      include: {
        bancoConvenios: {
          where: { ativo: true },
          include: {
            banco: { select: { id: true, nome: true } },
          },
        },
        _count: {
          select: {
            tabelasCoeficiente: { where: { ativo: true } },
            regrasProduto: { where: { ativa: true } },
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.banco.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return <ConveniosClient convenios={convenios} bancos={bancos} />;
}
