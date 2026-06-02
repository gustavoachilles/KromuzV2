import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

// GET /api/configuracoes/usuarios — lista usuários da empresa
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const usuarios = await prisma.usuarioPerfil.findMany({
    where: { empresaId: sessao.empresaId },
    select: {
      id: true,
      email: true,
      nome: true,
      perfilSlug: true,
      ativo: true,
      createdAt: true,
    },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return Response.json(usuarios);
}

const AtualizarUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  perfilSlug: z.enum(["admin", "gerente", "vendedor"]).optional(),
  ativo: z.boolean().optional(),
});

// PATCH /api/configuracoes/usuarios — edita perfil de um usuário
export async function PATCH(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  if (sessao.perfilSlug !== "admin") {
    return Response.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const { id, ...campos } = AtualizarUsuarioSchema.extend({
      id: z.string().uuid(),
    }).parse(await req.json());

    // Garante que o usuário pertence à mesma empresa
    const usuario = await prisma.usuarioPerfil.findFirst({
      where: { id, empresaId: sessao.empresaId },
      select: { id: true },
    });
    if (!usuario) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });

    const atualizado = await prisma.usuarioPerfil.update({
      where: { id },
      data: campos,
    });

    return Response.json(atualizado);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
