import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { PERMISSOES_ADMIN, PERMISSOES_GERENTE, PERMISSOES_VENDEDOR } from "@/lib/permissions";

// POST /api/configuracoes/cargos/seed — cria os 3 cargos padrão para a empresa
export async function POST() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (sessao.perfilSlug !== "admin") return Response.json({ error: "Sem permissão." }, { status: 403 });

  const empresaId = sessao.empresaId;

  const defaults = [
    { nome: "Administrador", slug: "admin", permissoes: PERMISSOES_ADMIN, isSistema: true, isDefault: false },
    { nome: "Gerente",       slug: "gerente", permissoes: PERMISSOES_GERENTE, isSistema: true, isDefault: false },
    { nome: "Vendedor",      slug: "vendedor", permissoes: PERMISSOES_VENDEDOR, isSistema: true, isDefault: true },
  ];

  let criados = 0;
  for (const d of defaults) {
    const existe = await prisma.cargo.findFirst({ where: { empresaId, slug: d.slug } });
    if (!existe) {
      await prisma.cargo.create({ data: { empresaId, ...d } });
      criados++;
    }
  }

  // Vincular usuarios existentes aos cargos baseando-se no perfilSlug
  const cargos = await prisma.cargo.findMany({ where: { empresaId } });
  const cargoMap = Object.fromEntries(cargos.map(c => [c.slug, c.id]));

  const usuarios = await prisma.usuarioPerfil.findMany({
    where: { empresaId, cargoId: null }
  });

  for (const u of usuarios) {
    const cargoId = cargoMap[u.perfilSlug] || cargoMap["vendedor"];
    if (cargoId) {
      await prisma.usuarioPerfil.update({
        where: { id: u.id },
        data: { cargoId }
      });
    }
  }

  return Response.json({ criados, vinculados: usuarios.length });
}
