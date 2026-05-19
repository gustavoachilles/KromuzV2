import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

// GET /api/configuracoes/empresa — dados da empresa
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    select: {
      id: true,
      nomeEmpresa: true,
      nomeFantasia: true,
      cpfCnpj: true,
      status: true,
      planoSlug: true,
      diasTrial: true,
      dataTrialFim: true,
      logoUrl: true,
      corPrimaria: true,
      createdAt: true,
    },
  });

  if (!empresa) return Response.json({ error: "Empresa não encontrada" }, { status: 404 });

  return Response.json(empresa);
}

const AtualizarEmpresaSchema = z.object({
  nomeEmpresa: z.string().min(2).optional(),
  nomeFantasia: z.string().nullable().optional(),
  cpfCnpj: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  corPrimaria: z.string().nullable().optional(),
});

// PATCH /api/configuracoes/empresa — edita dados da empresa
export async function PATCH(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  // Apenas admin pode editar empresa
  if (sessao.perfilSlug !== "admin") {
    return Response.json({ error: "Sem permissão. Apenas administradores." }, { status: 403 });
  }

  try {
    const body = AtualizarEmpresaSchema.parse(await req.json());

    const empresa = await prisma.empresa.update({
      where: { id: sessao.empresaId },
      data: body,
    });

    return Response.json(empresa);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
