import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

// GET /api/produtos — lista produtos com banco e convênio
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const produtos = await prisma.produtoCredito.findMany({
    where: { empresaId: sessao.empresaId, ativo: true },
    include: {
      banco: { select: { id: true, nome: true } },
      convenio: { select: { id: true, nome: true } },
      _count: {
        select: {
          tabelasCoeficiente: { where: { ativo: true } },
          regras: { where: { ativa: true } },
        },
      },
    },
    orderBy: [{ banco: { nome: "asc" } }, { nomeProduto: "asc" }],
  });

  return Response.json(produtos);
}

const CriarProdutoSchema = z.object({
  bancoId: z.string().uuid(),
  convenioId: z.string().uuid().nullable().optional(),
  nomeProduto: z.string().min(2),
  tipoProduto: z.enum([
    "EMPRESTIMO_CONSIGNADO",
    "REFINANCIAMENTO",
    "PORTABILIDADE",
    "PORTABILIDADE_REFIN",
    "CARTAO_CONSIGNADO",
    "CARTAO_BENEFICIO",
  ]),
  prazoMaximo: z.number().int().positive().optional(),
  taxaMedia: z.number().positive().optional(),
  observacoes: z.string().optional(),
});

// POST /api/produtos — cria produto
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = CriarProdutoSchema.parse(await req.json());

    // Valida banco pertence à empresa
    const banco = await prisma.banco.findFirst({
      where: { id: body.bancoId, empresaId: sessao.empresaId },
      select: { id: true },
    });
    if (!banco) return Response.json({ error: "Banco não encontrado" }, { status: 404 });

    const produto = await prisma.produtoCredito.create({
      data: {
        empresaId: sessao.empresaId,
        bancoId: body.bancoId,
        convenioId: body.convenioId || null,
        nomeProduto: body.nomeProduto,
        tipoProduto: body.tipoProduto,
        prazoMaximo: body.prazoMaximo,
        taxaMedia: body.taxaMedia,
        observacoes: body.observacoes,
        ativo: true,
      },
    });

    return Response.json(produto, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return Response.json({ error: "Produto duplicado para este banco/tipo/convênio." }, { status: 409 });
    }
    return Response.json({ error: e.message }, { status: 400 });
  }
}
