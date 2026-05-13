import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";
import { calculateLeadScore } from "@/lib/scoring";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/leads/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, empresaId: sessao.empresaId },
    include: { arquivos: true }
  });
  if (!lead) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

  return Response.json(lead);
}

const AtualizarLeadSchema = z.object({
  nome: z.string().min(2).optional(),
  cpf: z.string().nullable().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  uf: z.string().max(2).nullable().optional(),
  cidade: z.string().nullable().optional(),
  dataNascimento: z.string().optional(),
  numeroBeneficio: z.string().nullable().optional(),
  especieBeneficio: z.number().nullable().optional(),
  origem: z.string().nullable().optional(),
  canalContato: z.string().nullable().optional(),
  convenioNome: z.string().nullable().optional(),
  status: z.string().optional(),
  observacoes: z.string().nullable().optional(),
  motivoPerda: z.string().nullable().optional(),
  tipoOperacao: z.enum([
    "EMPRESTIMO_CONSIGNADO", "REFINANCIAMENTO", "PORTABILIDADE",
    "PORTABILIDADE_REFIN", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIO",
  ]).nullable().optional(),
  valorLiberado: z.number().nullable().optional(),
  bancoPreferido: z.string().nullable().optional(),
  margemLivre: z.number().nullable().optional(),
  margemRmc: z.number().nullable().optional(),
  margemRcc: z.number().nullable().optional(),
  ultimoContato: z.string().datetime().nullable().optional(),
  proximoContato: z.string().datetime().nullable().optional(),
  arquivos: z.array(z.object({
    nome: z.string(),
    tipo: z.string().optional(),
    tamanho: z.number().optional(),
    url: z.string()
  })).optional(),
});

// PATCH /api/leads/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const existe = await prisma.lead.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true, status: true, bancoPreferido: true, dataNascimento: true, especieBeneficio: true, margemLivre: true, uf: true },
  });
  if (!existe) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

  try {
    const body = AtualizarLeadSchema.parse(await req.json());

    // Calcular Novo Score
    const margemLivre = body.margemLivre !== undefined ? body.margemLivre : existe.margemLivre;
    const especieBeneficio = body.especieBeneficio !== undefined ? body.especieBeneficio : existe.especieBeneficio;
    const uf = body.uf !== undefined ? body.uf : existe.uf;
    
    let idade = undefined;
    const dataNasc = body.dataNascimento ? new Date(body.dataNascimento) : existe.dataNascimento;
    if (dataNasc) {
      idade = new Date().getFullYear() - dataNasc.getFullYear();
    }

    const novoScore = calculateLeadScore({
      idade,
      especieBeneficio: especieBeneficio || undefined,
      margemLivre: margemLivre || undefined,
      uf: uf || undefined
    });

    const leadAtualizado = await prisma.lead.update({
      where: { id },
      data: {
        nome: body.nome,
        cpf: body.cpf,
        telefone: body.telefone,
        email: body.email,
        uf: body.uf,
        cidade: body.cidade,
        dataNascimento: dataNasc,
        numeroBeneficio: body.numeroBeneficio,
        especieBeneficio: body.especieBeneficio,
        margemLivre: body.margemLivre,
        margemRmc: body.margemRmc,
        margemRcc: body.margemRcc,
        origem: body.origem,
        canalContato: body.canalContato,
        status: body.status,
        observacoes: body.observacoes,
        motivoPerda: body.motivoPerda,
        tipoOperacao: body.tipoOperacao,
        valorLiberado: body.valorLiberado,
        bancoPreferido: body.bancoPreferido,
        convenioNome: body.convenioNome,
        score: novoScore,
        ultimoContato: body.ultimoContato ? new Date(body.ultimoContato) : undefined,
        proximoContato: body.proximoContato ? new Date(body.proximoContato) : undefined,
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

    // ─── AUTOMAÇÃO BANCÁRIA (MOCK) ───
    if (body.status && body.status !== existe.status) {
      const colunaDestino = await prisma.pipelineColuna.findUnique({ where: { id: body.status } });
      
      if (colunaDestino && colunaDestino.nome.toUpperCase() === "DIGITADA") {
        const bancoPreferido = body.bancoPreferido || existe.bancoPreferido;
        if (bancoPreferido) {
          const banco = await prisma.banco.findFirst({
            where: { empresaId: sessao.empresaId, nome: bancoPreferido }
          });

          if (banco && banco.permiteIntegracao && banco.credenciaisApi) {
            await prisma.auditLog.create({
              data: {
                empresaId: sessao.empresaId,
                usuarioEmail: "robo@kromuz.com",
                usuarioNome: "Robô de Integração",
                acao: "integrou_banco",
                entidade: "lead",
                entidadeId: id,
                entidadeNome: body.nome || "Lead",
                detalhes: {
                  mensagem: `Proposta enviada com sucesso para a API do ${banco.nome}`,
                  statusHttp: 200
                }
              }
            });
          }
        }
      }

      // ─── AUTOMAÇÃO DE WHATSAPP ───
      if (colunaDestino && (colunaDestino.nome.toUpperCase() === "PROPOSTA" || colunaDestino.nome.toUpperCase() === "PAGO")) {
        if (body.telefone) {
          await prisma.auditLog.create({
            data: {
              empresaId: sessao.empresaId,
              usuarioEmail: "whatsapp@kromuz.com",
              usuarioNome: "Robô do WhatsApp",
              acao: "disparo_whatsapp",
              entidade: "lead",
              entidadeId: id,
              entidadeNome: body.nome || "Lead",
              detalhes: {
                mensagem: `Mensagem enviada no WhatsApp do cliente (${body.telefone}) referente à fase ${colunaDestino.nome}`,
                statusHttp: 200
              }
            }
          });
        }
      }
    }

    return Response.json(leadAtualizado);
  } catch (e: any) {
    console.error("Erro ao atualizar lead:", e);
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/leads/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  if (sessao.perfilSlug === "vendedor") {
    return Response.json({ error: "Acesso negado: Vendedores não podem excluir leads." }, { status: 403 });
  }

  const { id } = await params;
  const existe = await prisma.lead.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

  await prisma.lead.delete({ where: { id } });
  return Response.json({ ok: true });
}
