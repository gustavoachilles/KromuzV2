import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

// GET /api/convenios — lista convênios da empresa
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const convenios = await prisma.convenio.findMany({
    where: { empresaId: sessao.empresaId, ativo: true },
    include: {
      _count: {
        select: {
          bancoConvenios: { where: { ativo: true } },
          tabelasCoeficiente: { where: { ativo: true } },
          regrasProduto: { where: { ativa: true } },
        },
      },
    },
    orderBy: { nome: "asc" },
  });

  return Response.json(convenios);
}

const CriarConvenioSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório (mínimo 2 caracteres)"),
  slug: z.string().min(2).regex(/^[a-z0-9_-]+$/, "Slug deve conter apenas letras minúsculas, números, _ ou -"),
  tipo: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
});

// POST /api/convenios — cria convênio
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = CriarConvenioSchema.parse(await req.json());

    const convenio = await prisma.convenio.create({
      data: {
        empresaId: sessao.empresaId,
        nome: body.nome,
        slug: body.slug,
        tipo: body.tipo,
        descricao: body.descricao,
        ativo: true,
      },
    });

    return Response.json(convenio, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return Response.json({ error: "Já existe um convênio com este slug." }, { status: 409 });
    }
    return Response.json({ error: e.message }, { status: 400 });
  }
}
