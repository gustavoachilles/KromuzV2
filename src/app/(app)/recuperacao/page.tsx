import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RecuperacaoClient } from "./RecuperacaoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Motor de Recuperação | Kromuz",
  description: "Encontre leads inativos próximos da data de corte do banco.",
};

export default async function RecuperacaoPage() {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;

  // Pegar leads que não foram tocados há mais de 10 dias e que não foram dados como Ganho/Perdido
  const dezDiasAtras = new Date();
  dezDiasAtras.setDate(dezDiasAtras.getDate() - 10);

  const leadsInativos = await prisma.lead.findMany({
    where: {
      empresaId: eid,
      status: { notIn: ["GANHO", "PERDIDO", "PAGO"] },
      updatedAt: { lt: dezDiasAtras }
    },
    select: {
      id: true,
      nome: true,
      cpf: true,
      telefone: true,
      bancoPreferido: true,
      valorLiberado: true,
      margemLivre: true,
      vendedorNome: true,
      updatedAt: true,
      status: true,
      score: true
    },
    orderBy: { updatedAt: "asc" }
  });

  return (
    <RecuperacaoClient leads={leadsInativos} />
  );
}
