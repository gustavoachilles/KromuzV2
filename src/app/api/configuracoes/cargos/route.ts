import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";
import { PERMISSOES_ADMIN, PERMISSOES_GERENTE, PERMISSOES_VENDEDOR } from "@/lib/permissions";

// GET /api/configuracoes/cargos — lista cargos da empresa
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const cargos = await prisma.cargo.findMany({
    where: { empresaId: sessao.empresaId },
    include: { _count: { select: { usuarios: true } } },
    orderBy: [{ isSistema: "desc" }, { nome: "asc" }],
  });

  return Response.json(cargos);
}

const CriarCargoSchema = z.object({
  nome: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9_]+$/),
  descricao: z.string().optional(),
  permissoes: z.record(z.boolean()),
});

// POST /api/configuracoes/cargos — cria novo cargo
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (sessao.perfilSlug !== "admin") return Response.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const dados = CriarCargoSchema.parse(await req.json());

    const existe = await prisma.cargo.findFirst({
      where: { empresaId: sessao.empresaId, slug: dados.slug }
    });
    if (existe) return Response.json({ error: "Já existe um cargo com esse slug." }, { status: 400 });

    const cargo = await prisma.cargo.create({
      data: {
        empresaId: sessao.empresaId,
        nome: dados.nome,
        slug: dados.slug,
        descricao: dados.descricao,
        permissoes: dados.permissoes,
      }
    });

    return Response.json(cargo, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

const EditarCargoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  permissoes: z.record(z.boolean()).optional(),
});

// PATCH /api/configuracoes/cargos — edita cargo existente
export async function PATCH(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (sessao.perfilSlug !== "admin") return Response.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const { id, ...campos } = EditarCargoSchema.parse(await req.json());

    const cargo = await prisma.cargo.findFirst({
      where: { id, empresaId: sessao.empresaId },
    });
    if (!cargo) return Response.json({ error: "Cargo não encontrado" }, { status: 404 });

    // Não permite alterar permissões do cargo Admin do sistema
    if (cargo.isSistema && cargo.slug === "admin" && campos.permissoes) {
      return Response.json({ error: "Não é possível alterar permissões do Administrador." }, { status: 403 });
    }

    const atualizado = await prisma.cargo.update({
      where: { id },
      data: campos,
    });

    return Response.json(atualizado);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/configuracoes/cargos — remove cargo (não permite deletar isSistema)
export async function DELETE(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (sessao.perfilSlug !== "admin") return Response.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(await req.json());

    const cargo = await prisma.cargo.findFirst({
      where: { id, empresaId: sessao.empresaId },
      include: { _count: { select: { usuarios: true } } }
    });
    if (!cargo) return Response.json({ error: "Cargo não encontrado" }, { status: 404 });
    if (cargo.isSistema) return Response.json({ error: "Cargos do sistema não podem ser removidos." }, { status: 403 });
    if (cargo._count.usuarios > 0) return Response.json({ error: `Este cargo possui ${cargo._count.usuarios} usuário(s). Remova-os antes de deletar.` }, { status: 400 });

    await prisma.cargo.delete({ where: { id } });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
