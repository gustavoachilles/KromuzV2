import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DisparosClient } from "./DisparosClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Disparos em Massa | Kromuz",
  description: "Crie campanhas de WhatsApp para sua base de leads.",
};

export default async function DisparosPage() {
  const sessao = await getSessionEmpresa();

  const [campanhas, canais] = await Promise.all([
    prisma.campanhaDisparo.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.canalComunicacao.findMany({
      where: { empresaId: sessao.empresaId, ativo: true }
    })
  ]);

  return (
    <DisparosClient 
      campanhas={campanhas} 
      canais={canais}
      sessao={{ userId: sessao.userId, perfilSlug: sessao.perfilSlug }} 
    />
  );
}
