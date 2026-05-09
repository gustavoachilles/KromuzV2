import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

const IntegrarSchema = z.object({
  leadId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = IntegrarSchema.parse(await req.json());

    // 1. Busca o Lead
    const lead = await prisma.lead.findFirst({
      where: { id: body.leadId, empresaId: sessao.empresaId },
    });

    if (!lead) return Response.json({ error: "Lead não encontrado" }, { status: 404 });
    if (!lead.bancoPreferido) return Response.json({ error: "Lead não possui banco selecionado para integração" }, { status: 400 });

    // 2. Busca o Banco e as Credenciais
    const banco = await prisma.banco.findFirst({
      where: { empresaId: sessao.empresaId, nome: lead.bancoPreferido },
    });

    if (!banco) return Response.json({ error: "Banco selecionado não está cadastrado na base" }, { status: 400 });

    // 3. Cria a Proposta no sistema Kromuz
    const proposta = await prisma.proposta.create({
      data: {
        empresaId: sessao.empresaId,
        leadId: lead.id,
        bancoId: banco.id,
        bancoNome: banco.nome,
        convenioNome: lead.convenioNome,
        clienteNome: lead.nome,
        clienteCpf: lead.cpf,
        clienteTelefone: lead.telefone,
        numeroBeneficio: lead.numeroBeneficio,
        especieBeneficio: lead.especieBeneficio,
        tipoOperacao: (lead.tipoOperacao as any) || "EMPRESTIMO_CONSIGNADO",
        valorLiberado: lead.valorEstimado,
        status: "DIGITADA", // Proposta que vai para o banco entra como DIGITADA
        vendedorEmail: sessao.email,
        vendedorNome: sessao.nomeUsuario,
        observacoes: "Gerada automaticamente via integração do Kanban.",
        integradaBanco: false,
      },
    });

    // 4. Integração Bancária (Simulada)
    if (banco.permiteIntegracao && banco.credenciaisApi) {
      // Simula o tempo de resposta da API do banco
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Sucesso na simulação! Atualiza a proposta
      const propostaIntegrada = await prisma.proposta.update({
        where: { id: proposta.id },
        data: {
          integradaBanco: true,
          codigoPropostaBanco: `BNC-${Math.floor(Math.random() * 1000000)}`, // ADE Fake
        }
      });
      return Response.json({ success: true, integrada: true, proposta: propostaIntegrada });
    }

    // Se o banco não permite integração, só criamos a proposta localmente
    return Response.json({ success: true, integrada: false, proposta });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
