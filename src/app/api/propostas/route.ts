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
  clienteCpf: z.string().optional().nullable(),
  clienteTelefone: z.string().optional().nullable(),
  numeroBeneficio: z.string().optional().nullable(),
  especieBeneficio: z.number().int().optional().nullable(),
  tipoOperacao: z.enum([
    "EMPRESTIMO_CONSIGNADO", "REFINANCIAMENTO", "PORTABILIDADE",
    "PORTABILIDADE_REFIN", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIO",
  ]).optional().nullable(),
  bancoId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  bancoNome: z.string().optional().nullable(),
  bancoOrigem: z.string().optional().nullable(),
  produtoNome: z.string().optional().nullable(),
  convenioNome: z.string().optional().nullable(),
  valorParcela: z.number().optional().nullable(),
  valorLiberado: z.number().optional().nullable(),
  saldoDevedor: z.number().optional().nullable(),
  prazo: z.number().int().optional().nullable(),
  taxaJuros: z.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  
  // Referências
  promotoraId: z.string().uuid().optional().nullable(),
  tabelaId: z.string().uuid().optional().nullable(),
  codigoPropostaBanco: z.string().optional().nullable(),
  digitadaEm: z.coerce.date().optional().nullable(),
  pagaEm: z.coerce.date().optional().nullable(),

  // Portabilidade
  parcelaAtual: z.number().optional().nullable(),
  prazoAtual: z.number().int().optional().nullable(),
  parcelasPagas: z.number().int().optional().nullable(),
  parcelasEmAberto: z.number().int().optional().nullable(),
  troco: z.number().optional().nullable(),

  // Pagamento
  formaPagamento: z.string().optional().nullable(),
  bancoPagamento: z.string().optional().nullable(),
  agenciaPagamento: z.string().optional().nullable(),
  contaPagamento: z.string().optional().nullable(),
  chavePix: z.string().optional().nullable(),
  tipoChavePix: z.string().optional().nullable(),
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
        leadId: body.leadId,
        bancoNome: body.bancoNome,
        bancoOrigem: body.bancoOrigem,
        produtoNome: body.produtoNome,
        convenioNome: body.convenioNome,
        valorParcela: body.valorParcela,
        valorLiberado: body.valorLiberado,
        saldoDevedor: body.saldoDevedor,
        prazo: body.prazo,
        taxaJuros: body.taxaJuros,
        observacoes: body.observacoes,
        
        promotoraId: body.promotoraId,
        tabelaId: body.tabelaId,
        codigoPropostaBanco: body.codigoPropostaBanco,
        digitadaEm: body.digitadaEm,
        pagaEm: body.pagaEm,
        
        parcelaAtual: body.parcelaAtual,
        prazoAtual: body.prazoAtual,
        parcelasPagas: body.parcelasPagas,
        parcelasEmAberto: body.parcelasEmAberto,
        troco: body.troco,
        
        formaPagamento: body.formaPagamento,
        bancoPagamento: body.bancoPagamento,
        agenciaPagamento: body.agenciaPagamento,
        contaPagamento: body.contaPagamento,
        chavePix: body.chavePix,
        tipoChavePix: body.tipoChavePix,

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
