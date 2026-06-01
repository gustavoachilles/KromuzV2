import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// GET /api/leads/buscar?q=texto — busca leads por nome, cpf ou telefone
export async function GET(req: Request) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return Response.json([]);

  const leads = await prisma.lead.findMany({
    where: {
      empresaId: sessao.empresaId,
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { cpf: { contains: q.replace(/\D/g, "") } },
        { telefone: { contains: q.replace(/\D/g, "") } },
      ],
    },
    select: {
      id: true,
      nome: true,
      cpf: true,
      telefone: true,
      numeroBeneficio: true,
      especieBeneficio: true,
    },
    orderBy: { nome: "asc" },
    take: 10,
  });

  return Response.json(leads);
}
