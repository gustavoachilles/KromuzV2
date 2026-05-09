import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InboxClient } from "./InboxClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inbox Omnichannel | Kromuz",
  description: "Atendimento centralizado WhatsApp, Instagram e Facebook.",
};

export default async function InboxPage() {
  const sessao = await getSessionEmpresa();

  const conversas = await prisma.conversa.findMany({
    where: { empresaId: sessao.empresaId },
    include: { canal: true, mensagens: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="h-[calc(100vh-4rem)] -m-8">
      <InboxClient 
        conversas={conversas} 
        sessao={{ userId: sessao.userId, perfilSlug: sessao.perfilSlug }} 
      />
    </div>
  );
}
