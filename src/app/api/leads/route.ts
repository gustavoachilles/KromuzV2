import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";
import { calculateLeadScore } from "@/lib/scoring";

// GET /api/leads
export async function GET(req: Request) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limite = Math.min(Number(url.searchParams.get("limite") || 100), 500);

  const leads = await prisma.lead.findMany({
    where: {
      empresaId: sessao.empresaId,
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limite,
  });

  return Response.json(leads);
}

const CriarLeadSchema = z.object({
  nome: z.string().min(2),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  uf: z.string().max(2).optional(),
  cidade: z.string().optional(),
  dataNascimento: z.string().optional(),
  numeroBeneficio: z.string().optional(),
  especieBeneficio: z.number().int().optional(),
  margemLivre: z.number().optional(),
  margemRmc: z.number().optional(),
  margemRcc: z.number().optional(),
  origem: z.string().optional(),
  canalContato: z.string().optional(),
  tipoOperacao: z.enum([
    "EMPRESTIMO_CONSIGNADO", "REFINANCIAMENTO", "PORTABILIDADE",
    "PORTABILIDADE_REFIN", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIO",
  ]).optional(),
  valorLiberado: z.number().optional(),
  bancoPreferido: z.string().optional(),
  convenioNome: z.string().optional(),
  renda: z.number().optional(),
  ddb: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  bancoCliente: z.string().optional(),
  agenciaCliente: z.string().optional(),
  contaCliente: z.string().optional(),
  tipoContaCliente: z.string().optional(),
  observacoes: z.string().optional(),
  arquivos: z.array(z.object({
    nome: z.string(),
    tipo: z.string().optional(),
    tamanho: z.number().optional(),
    url: z.string()
  })).optional(),
});

// POST /api/leads
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = CriarLeadSchema.parse(await req.json());

    // Calcular Idade para o Scoring
    let idade = undefined;
    if (body.dataNascimento) {
      const nasc = new Date(body.dataNascimento);
      idade = new Date().getFullYear() - nasc.getFullYear();
    }

    const score = calculateLeadScore({
      idade,
      especieBeneficio: body.especieBeneficio,
      margemLivre: body.margemLivre,
      uf: body.uf
    });

    const lead = await prisma.lead.create({
      data: {
        empresaId: sessao.empresaId,
        nome: body.nome,
        cpf: body.cpf,
        telefone: body.telefone,
        email: body.email,
        uf: body.uf,
        cidade: body.cidade,
        dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : undefined,
        numeroBeneficio: body.numeroBeneficio,
        especieBeneficio: body.especieBeneficio,
        margemLivre: body.margemLivre,
        margemRmc: body.margemRmc,
        margemRcc: body.margemRcc,
        origem: body.origem,
        canalContato: body.canalContato,
        tipoOperacao: body.tipoOperacao,
        valorLiberado: body.valorLiberado,
        bancoPreferido: body.bancoPreferido,
        convenioNome: body.convenioNome,
        renda: body.renda,
        ddb: body.ddb ? new Date(body.ddb) : undefined,
        cep: body.cep,
        logradouro: body.logradouro,
        numero: body.numero,
        complemento: body.complemento,
        bairro: body.bairro,
        bancoCliente: body.bancoCliente,
        agenciaCliente: body.agenciaCliente,
        contaCliente: body.contaCliente,
        tipoContaCliente: body.tipoContaCliente,
        observacoes: body.observacoes,
        vendedorEmail: sessao.email,
        vendedorNome: sessao.nomeUsuario,
        status: "NOVO",
        score,
        arquivos: body.arquivos && body.arquivos.length > 0 ? {
          create: body.arquivos.map(a => ({
            nome: a.nome,
            tipo: a.tipo,
            tamanho: a.tamanho,
            url: a.url
          }))
        } : undefined
      },
    });

    return Response.json(lead, { status: 201 });
  } catch (e: any) {
    console.error("Erro ao criar lead:", e);
    return Response.json({ error: "Erro interno do servidor" }, { status: 400 });
  }
}
