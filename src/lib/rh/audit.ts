// Utilitário de Log de Auditoria para módulo RH
// Registra quem fez o quê, quando e com quais dados

import { prisma } from "@/lib/prisma";

export type AuditAcao =
  | "CRIAR_FUNCIONARIO"
  | "EDITAR_FUNCIONARIO"
  | "EXCLUIR_FUNCIONARIO"
  | "BATER_PONTO"
  | "REGISTRAR_PAUSA"
  | "AGENDAR_FERIAS"
  | "CANCELAR_FERIAS"
  | "SIMULAR_RESCISAO";

export async function registrarAudit(params: {
  empresaId: string;
  usuarioId: string;
  usuarioEmail: string;
  acao: AuditAcao;
  entidade: string;
  entidadeId?: string;
  descricao: string;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.auditLogRH.create({
      data: {
        empresaId: params.empresaId,
        usuarioId: params.usuarioId,
        usuarioEmail: params.usuarioEmail,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId || null,
        descricao: params.descricao,
        dadosAntes: params.dadosAntes || undefined,
        dadosDepois: params.dadosDepois || undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    // Nunca deixar o audit log quebrar a operação principal
    console.error("[AuditLog] Falha ao registrar:", error);
  }
}

// Helper para extrair IP do request
export function getIPFromRequest(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
