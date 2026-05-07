import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

// GET /api/propostas — lista propostas
export async function GET(req: Request) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limite = Math.min(Number(url.searchParams.get("limite") || 50), 200);

  const propostas = await prisma.proposta.findMany({
    where: {
      empresaId: sessao.empresaId,
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limite,
  });

  return Response.json(propostas);
}

const CriarPropostaSchema = z.object({
  clienteNome: z.string().min(2),
  clienteCpf: z.string().optional(),
  clienteTelefone: z.string().optional(),
  numeroBeneficio: z.string().optional(),
  especieBeneficio: z.number().int().optional(),
  tipoOperacao: z.enum([
    "EMPRESTIMO_CONSIGNADO", "REFINANCIAMENTO", "PORTABILIDADE",
    "PORTABILIDADE_REFIN", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIO",
  ]),
  bancoId: z.string().uuid().optional(),
  bancoNome: z.string().optional(),
  produtoNome: z.string().optional(),
  convenioNome: z.string().optional(),
  valorParcela: z.number().optional(),
  valorLiberado: z.number().optional(),
  prazo: z.number().int().optional(),
  taxaJuros: z.number().optional(),
  observacoes: z.string().optional(),
});

// POST /api/propostas — cria proposta
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = CriarPropostaSchema.parse(await req.json());

    const proposta = await prisma.proposta.create({
      data: {
        empresaId: sessao.empresaId,
        clienteNome: body.clienteNome,
        clienteCpf: body.clienteCpf,
        clienteTelefone: body.clienteTelefone,
        numeroBeneficio: body.numeroBeneficio,
        especieBeneficio: body.especieBeneficio,
        tipoOperacao: body.tipoOperacao,
        bancoNome: body.bancoNome,
        produtoNome: body.produtoNome,
        convenioNome: body.convenioNome,
        valorParcela: body.valorParcela,
        valorLiberado: body.valorLiberado,
        prazo: body.prazo,
        taxaJuros: body.taxaJuros,
        observacoes: body.observacoes,
        vendedorEmail: sessao.email,
        vendedorNome: sessao.nomeUsuario,
        status: "RASCUNHO",
      },
    });

    return Response.json(proposta, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
