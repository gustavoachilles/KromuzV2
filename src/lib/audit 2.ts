import { prisma } from "@/lib/prisma";

/**
 * Registra uma ação no log de auditoria.
 * Chamado internamente pelas APIs de mutação.
 */
export async function registrarAuditoria({
  empresaId,
  usuarioEmail,
  usuarioNome,
  acao,
  entidade,
  entidadeId,
  entidadeNome,
  detalhes,
  ip,
}: {
  empresaId: string;
  usuarioEmail: string;
  usuarioNome?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  entidadeNome?: string | null;
  detalhes?: Record<string, any> | null;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        empresaId,
        usuarioEmail,
        usuarioNome: usuarioNome || null,
        acao,
        entidade,
        entidadeId: entidadeId || null,
        entidadeNome: entidadeNome || null,
        detalhes: detalhes || undefined,
        ip: ip || null,
      },
    });
  } catch (e) {
    // Silently fail — audit should never break operations
    console.error("[AuditLog] Falha ao registrar:", e);
  }
}
