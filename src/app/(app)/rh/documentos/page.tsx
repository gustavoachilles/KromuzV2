import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DocumentosClient } from "./DocumentosClient";

export const metadata = { title: "Documentos | RH & Compliance | Kromuz" };

export default async function DocumentosPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug === "vendedor") redirect("/leads");

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId, status: { in: ["ATIVO", "FERIAS", "AFASTADO"] } },
    include: { documentos: { orderBy: { createdAt: "desc" } } },
    orderBy: { nome: "asc" },
  });

  return <DocumentosClient funcionarios={JSON.parse(JSON.stringify(funcionarios))} empresaId={sessao.empresaId} />;
}
