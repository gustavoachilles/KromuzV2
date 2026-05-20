import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AuditoriaClient } from "./AuditoriaClient";

export const metadata = { title: "Auditoria RH | Compliance | Kromuz" };

export default async function AuditoriaPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug !== "admin") redirect("/rh");

  const logs = await prisma.auditLogRH.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <AuditoriaClient logs={JSON.parse(JSON.stringify(logs))} />;
}
