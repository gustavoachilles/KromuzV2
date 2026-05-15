import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// Convênios padrão do mercado de consignado brasileiro
const CONVENIOS_PADRAO = [
  { nome: "INSS",              slug: "inss",              tipo: "federal",    descricao: "Instituto Nacional do Seguro Social - Aposentados e Pensionistas" },
  { nome: "SIAPE",             slug: "siape",             tipo: "federal",    descricao: "Servidores Públicos Federais" },
  { nome: "Forças Armadas",    slug: "forcas-armadas",    tipo: "federal",    descricao: "Exército, Marinha e Aeronáutica" },
  { nome: "Governo Federal",   slug: "governo-federal",   tipo: "federal",    descricao: "Servidores do Governo Federal (exceto SIAPE)" },
  { nome: "Governo Estadual",  slug: "governo-estadual",  tipo: "estadual",   descricao: "Servidores Públicos Estaduais" },
  { nome: "Governo Municipal", slug: "governo-municipal", tipo: "municipal",  descricao: "Servidores Públicos Municipais" },
  { nome: "FGTS",              slug: "fgts",              tipo: "federal",    descricao: "Fundo de Garantia do Tempo de Serviço" },
  { nome: "CLT Privado",       slug: "clt-privado",       tipo: "privado",    descricao: "Trabalhadores CLT do setor privado" },
];

// POST /api/convenios/seed — cria convênios padrão para a empresa
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (sessao.perfilSlug !== "admin") return Response.json({ error: "Sem permissão" }, { status: 403 });

  const criados: string[] = [];
  const existentes: string[] = [];

  for (const conv of CONVENIOS_PADRAO) {
    const existe = await prisma.convenio.findFirst({
      where: { empresaId: sessao.empresaId, slug: conv.slug },
    });

    if (existe) {
      existentes.push(conv.nome);
      continue;
    }

    await prisma.convenio.create({
      data: {
        empresaId: sessao.empresaId,
        nome: conv.nome,
        slug: conv.slug,
        tipo: conv.tipo,
        descricao: conv.descricao,
        ativo: true,
      },
    });
    criados.push(conv.nome);
  }

  return Response.json({
    ok: true,
    criados,
    existentes,
    message: `${criados.length} convênios criados, ${existentes.length} já existiam.`,
  });
}
