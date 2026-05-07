import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AuditoriaClient } from "./AuditoriaClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Auditoria | Kromuz",
  description: "Log de alterações e ações realizadas na plataforma.",
};

export default async function AuditoriaPage() {
  const sessao = await getSessionEmpresa();

  const logs = await prisma.auditLog.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <AuditoriaClient logs={logs} />;
}
