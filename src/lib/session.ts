import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type SessionEmpresa = {
  userId: string;
  email: string;
  empresaId: string;
  nomeEmpresa: string;
  perfilSlug: string;
  nomeUsuario: string | null;
};

/**
 * Retorna os dados da sessão autenticada (userId + empresaId).
 * Se não autenticado, redireciona para /login.
 * Usar em Server Components e API Routes.
 */
export async function getSessionEmpresa(): Promise<SessionEmpresa> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Busca o perfil do usuário vinculado à empresa
  const perfil = await prisma.usuarioPerfil.findFirst({
    where: { authUserId: user.id },
    include: { empresa: { select: { id: true, nomeEmpresa: true } } },
  });

  if (!perfil) {
    try {
      // Usuário autenticado mas sem perfil — cria empresa + perfil automaticamente
      const novaEmpresa = await prisma.empresa.create({
        data: {
          nomeEmpresa: user.email?.split("@")[0] || "Minha Empresa",
          status: "ativo",
          planoSlug: "beta",
        },
      });

      const novoPerfil = await prisma.usuarioPerfil.create({
        data: {
          empresaId: novaEmpresa.id,
          authUserId: user.id,
          email: user.email || "",
          nome: user.user_metadata?.nome || user.email?.split("@")[0] || null,
          perfilSlug: "admin",
        },
      });

      return {
        userId: novoPerfil.id,
        email: novoPerfil.email,
        empresaId: novaEmpresa.id,
        nomeEmpresa: novaEmpresa.nomeEmpresa,
        perfilSlug: novoPerfil.perfilSlug,
        nomeUsuario: novoPerfil.nome,
      };
    } catch (e: any) {
      // Se ocorrer erro de constraint (P2002), significa que a renderização paralela já criou o perfil
      if (e.code === "P2002") {
        const perfilExistente = await prisma.usuarioPerfil.findUnique({
          where: { authUserId: user.id },
          include: { empresa: { select: { id: true, nomeEmpresa: true } } },
        });
        if (perfilExistente) {
          return {
            userId: perfilExistente.id,
            email: perfilExistente.email,
            empresaId: perfilExistente.empresaId,
            nomeEmpresa: perfilExistente.empresa.nomeEmpresa,
            perfilSlug: perfilExistente.perfilSlug,
            nomeUsuario: perfilExistente.nome,
          };
        }
      }
      throw e;
    }
  }

  return {
    userId: user.id,
    email: user.email || "",
    empresaId: perfil.empresa.id,
    nomeEmpresa: perfil.empresa.nomeEmpresa,
    perfilSlug: perfil.perfilSlug,
    nomeUsuario: perfil.nome,
  };
}

/**
 * Versão para API Routes — retorna null ao invés de redirecionar.
 */
export async function getSessionEmpresaApi(): Promise<SessionEmpresa | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    const perfil = await prisma.usuarioPerfil.findFirst({
      where: { authUserId: user.id },
      include: { empresa: { select: { id: true, nomeEmpresa: true } } },
    });

    if (!perfil) return null;

    return {
      userId: user.id,
      email: user.email || "",
      empresaId: perfil.empresa.id,
      nomeEmpresa: perfil.empresa.nomeEmpresa,
      perfilSlug: perfil.perfilSlug,
      nomeUsuario: perfil.nome,
    };
  } catch (e) {
    console.error("[getSessionEmpresaApi] Falha na autenticação:", e);
    return null;
  }
}
