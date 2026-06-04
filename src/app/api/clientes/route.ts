import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// GET /api/clientes — lê do model Lead (mesma base)
export async function GET(req: Request) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const busca = url.searchParams.get("busca") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const where: any = {
    empresaId: sessao.empresaId,
    cpf: { not: null },
  };

  // Busca por nome, CPF, telefone, email ou NB
  if (busca.trim()) {
    const q = busca.trim();
    where.AND = [
      {
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { cpf: { contains: q } },
          { telefone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
          { numeroBeneficio: { contains: q } },
        ],
      },
    ];
  }

  const [clientes, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return Response.json({ clientes, total, page, limit });
}
