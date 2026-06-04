import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.empresaId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const empresaId = session.user.empresaId;

  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("busca") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    empresaId,
    // Cliente = Lead que tem pelo menos 1 proposta vinculada
    OR: [
      { cpf: { not: null } },
    ],
  };

  // Busca por nome, CPF ou telefone
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
      select: {
        id: true,
        nome: true,
        cpf: true,
        telefone: true,
        email: true,
        dataNascimento: true,
        uf: true,
        cidade: true,
        bairro: true,
        numeroBeneficio: true,
        especieBeneficio: true,
        margemLivre: true,
        margemRmc: true,
        margemRcc: true,
        renda: true,
        ddb: true,
        cep: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bancoCliente: true,
        agenciaCliente: true,
        contaCliente: true,
        tipoContaCliente: true,
        status: true,
        vendedorNome: true,
        vendedorEmail: true,
        observacoes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ clientes, total, page, limit });
}
