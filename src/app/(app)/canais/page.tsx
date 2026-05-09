import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CanaisClient } from "./CanaisClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Canais de Comunicação | Kromuz",
  description: "Gerencie as integrações de WhatsApp, Instagram e Facebook.",
};

export default async function CanaisPage() {
  const sessao = await getSessionEmpresa();

  const canais = await prisma.canalComunicacao.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <CanaisClient 
      canais={canais} 
      sessao={{ userId: sessao.userId, perfilSlug: sessao.perfilSlug }} 
    />
  );
}
