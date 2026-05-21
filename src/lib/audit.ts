import { prisma } from "@/lib/prisma";

/**
 * Registra uma ação no log de auditoria.
 * Chamada fire-and-forget — não bloqueia a resposta da API.
 */
export async function registrarAuditoria(params: {
  empresaId: string;
  usuarioEmail: string;
  usuarioNome?: string;
  acao: "CRIAR" | "EDITAR" | "EXCLUIR" | "EXPORTAR" | "LOGIN" | "LOGOUT";
  entidade: string;   // LANCAMENTO, CARTEIRA, DOCUMENTO, CERTIFICACAO, ATIVO, BORDERO, CATEGORIA, CONTA_BANCARIA, ORCAMENTO
  entidadeId?: string;
  entidadeNome?: string;
  detalhes?: Record<string, any>;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        empresaId: params.empresaId,
        usuarioEmail: params.usuarioEmail,
        usuarioNome: params.usuarioNome,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        entidadeNome: params.entidadeNome,
        detalhes: params.detalhes || undefined,
        ip: params.ip,
      },
    });
  } catch (e) {
    // Nunca falhar por causa de auditoria
    console.error("Erro ao registrar auditoria:", e);
  }
}
