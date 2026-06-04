import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// GET /api/leads/buscar?q=texto — busca leads por nome, cpf, telefone ou NB
export async function GET(req: Request) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return Response.json([]);

  const digitos = q.replace(/\D/g, "");
  const orConditions: any[] = [
    { nome: { contains: q, mode: "insensitive" } },
  ];
  // Só busca por CPF/telefone/NB se o texto tiver dígitos
  if (digitos.length >= 3) {
    orConditions.push({ cpf: { contains: digitos } });
    orConditions.push({ telefone: { contains: digitos } });
    orConditions.push({ numeroBeneficio: { contains: digitos } });
  }

  const leads = await prisma.lead.findMany({
    where: {
      empresaId: sessao.empresaId,
      OR: orConditions,
    },
    select: {
      id: true,
      nome: true,
      cpf: true,
      telefone: true,
      email: true,
      numeroBeneficio: true,
      especieBeneficio: true,
    },
    orderBy: { nome: "asc" },
    take: 10,
  });

  return Response.json(leads);
}
