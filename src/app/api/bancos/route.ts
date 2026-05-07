import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

// GET /api/bancos — lista bancos da empresa
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const bancos = await prisma.banco.findMany({
    where: { empresaId: sessao.empresaId },
    include: {
      _count: {
        select: {
          produtosCredito: true,
          tabelasCoeficiente: true,
          regrasProduto: { where: { ativa: true } },
        },
      },
    },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  return Response.json(bancos);
}

const CriarBancoSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório (mínimo 2 caracteres)"),
  codigoCompe: z.string().optional(),
  cnpj: z.string().optional(),
  tipo: z.string().default("consignado"),
  ativoSimulacao: z.boolean().default(false),
  observacoes: z.string().optional(),
});

// POST /api/bancos — cria banco
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = CriarBancoSchema.parse(await req.json());

    const banco = await prisma.banco.create({
      data: {
        empresaId: sessao.empresaId,
        nome: body.nome,
        codigoCompe: body.codigoCompe,
        cnpj: body.cnpj,
        tipo: body.tipo,
        tipoBanco: body.tipo,
        ativoSimulacao: body.ativoSimulacao,
        observacoes: body.observacoes,
        ativo: true,
      },
    });

    return Response.json(banco, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return Response.json({ error: "Já existe um banco com este nome." }, { status: 409 });
    }
    return Response.json({ error: e.message }, { status: 400 });
  }
}
