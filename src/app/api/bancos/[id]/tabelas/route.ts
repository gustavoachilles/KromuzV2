import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/bancos/[id]/tabelas — lista tabelas de coeficiente do banco
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id: bancoId } = await params;

  const tabelas = await prisma.tabelaCoeficiente.findMany({
    where: { bancoId, empresaId: sessao.empresaId, ativo: true },
    include: {
      produto: { select: { nomeProduto: true, tipoProduto: true } },
      convenio: { select: { nome: true } },
    },
    orderBy: [{ nome: "asc" }, { prazo: "asc" }],
  });

  return Response.json(tabelas);
}

const CriarTabelaSchema = z.object({
  produtoId: z.string().uuid(),
  convenioId: z.string().uuid().optional(),
  nome: z.string().min(2),
  prazo: z.number().int().min(1).max(120),
  taxaJurosMensal: z.number().min(0).max(10),
  coeficiente: z.number().min(0),
  comissaoFlatPct: z.number().nullable().optional(),
  comissaoRepassePct: z.number().nullable().optional(),
});

// POST /api/bancos/[id]/tabelas — cria tabela de coeficiente
export async function POST(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id: bancoId } = await params;

  // Valida que o banco pertence à empresa
  const banco = await prisma.banco.findFirst({
    where: { id: bancoId, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!banco) return Response.json({ error: "Banco não encontrado" }, { status: 404 });

  try {
    const body = CriarTabelaSchema.parse(await req.json());

    const tabela = await prisma.tabelaCoeficiente.create({
      data: {
        empresaId: sessao.empresaId,
        bancoId,
        produtoId: body.produtoId,
        convenioId: body.convenioId,
        nome: body.nome,
        prazo: body.prazo,
        taxaJurosMensal: body.taxaJurosMensal,
        coeficiente: body.coeficiente,
        comissaoFlatPct: body.comissaoFlatPct,
        comissaoRepassePct: body.comissaoRepassePct,
        ativo: true,
      },
    });

    return Response.json(tabela, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
