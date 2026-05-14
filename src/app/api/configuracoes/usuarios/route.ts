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

const CriarUsuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  perfilSlug: z.enum(["admin", "gerente", "vendedor"]),
});

// POST /api/configuracoes/usuarios — cria um novo usuário na empresa
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  if (sessao.perfilSlug !== "admin") {
    return Response.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const dados = CriarUsuarioSchema.parse(await req.json());

    // Verifica se já existe localmente
    const existe = await prisma.usuarioPerfil.findFirst({
      where: { email: dados.email }
    });
    
    if (existe) {
      return Response.json({ error: "Este e-mail já está cadastrado no sistema." }, { status: 400 });
    }

    // Usar a Service Role Key para criar usuários sem deslogar o admin atual
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Cria a identidade na Auth do Supabase (A senha padrão é forte para passar nas políticas)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dados.email,
      password: "Mudar@123",
      email_confirm: true,
      user_metadata: { nome: dados.nome, empresaId: sessao.empresaId }
    });

    if (authError || !authData.user) {
      // Retorna erro amigável se o email já estiver no Supabase global
      if (authError?.message.includes("already registered")) {
        throw new Error("Este e-mail já possui conta no Supabase. Solicite suporte.");
      }
      throw new Error(authError?.message || "Falha ao criar autenticação.");
    }

    // Registra o perfil na tabela local (Postgres via Prisma)
    const novoUsuario = await prisma.usuarioPerfil.create({
      data: {
        empresaId: sessao.empresaId,
        authUserId: authData.user.id,
        email: dados.email,
        nome: dados.nome,
        perfilSlug: dados.perfilSlug,
        ativo: true
      }
    });

    return Response.json(novoUsuario, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

