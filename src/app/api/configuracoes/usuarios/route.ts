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
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return Response.json(usuarios);
}

const AtualizarUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  perfilSlug: z.enum(["admin", "gerente", "vendedor"]).optional(),
  ativo: z.boolean().optional(),
  // Dados Pessoais
  telefone: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  rg: z.string().optional().nullable(),
  orgaoEmissor: z.string().optional().nullable(),
  genero: z.string().optional().nullable(),
  estadoCivil: z.string().optional().nullable(),
  timeFavorito: z.string().optional().nullable(),
  // Endereço
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  // Dados Bancários
  bancoNome: z.string().optional().nullable(),
  bancoAgencia: z.string().optional().nullable(),
  bancoConta: z.string().optional().nullable(),
  bancoTipoConta: z.string().optional().nullable(),
  chavePix: z.string().optional().nullable(),
  tipoChavePix: z.string().optional().nullable(),
  // Contratação
  dataContratacao: z.string().optional().nullable(),
  dataDesligamento: z.string().optional().nullable(),
  observacoesPessoais: z.string().optional().nullable(),
  // Perfil
  avatarUrl: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  // Horário de Acesso
  horarioInicio: z.string().optional().nullable(),
  horarioFim: z.string().optional().nullable(),
  diasAcesso: z.array(z.string()).optional().nullable(),
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

    // Converter datas string para Date quando necessário
    const data: any = { ...campos };
    if (data.dataNascimento) data.dataNascimento = new Date(data.dataNascimento);
    if (data.dataContratacao) data.dataContratacao = new Date(data.dataContratacao);
    if (data.dataDesligamento) data.dataDesligamento = new Date(data.dataDesligamento);

    const atualizado = await prisma.usuarioPerfil.update({
      where: { id },
      data,
    });

    return Response.json(atualizado);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

const CriarUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido. Verifique o formato (ex: nome@email.com)"),
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
    const parsed = CriarUsuarioSchema.safeParse(await req.json());
    
    if (!parsed.success) {
      // Retorna mensagem amigável de validação
      const firstError = parsed.error.issues[0];
      return Response.json({ error: firstError.message }, { status: 400 });
    }

    const dados = parsed.data;

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
      if (authError?.message.includes("already registered")) {
        return Response.json({ error: "Este e-mail já possui conta. Solicite suporte." }, { status: 400 });
      }
      return Response.json({ error: authError?.message || "Falha ao criar autenticação." }, { status: 400 });
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

// DELETE /api/configuracoes/usuarios — exclui usuário e migra negócios
export async function DELETE(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (sessao.perfilSlug !== "admin") return Response.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const { id, migrateToId } = await req.json();
    if (!id) return Response.json({ error: "ID obrigatório" }, { status: 400 });

    // Verifica que usuário pertence à mesma empresa
    const usuario = await prisma.usuarioPerfil.findFirst({
      where: { id, empresaId: sessao.empresaId },
    });
    if (!usuario) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });

    // Não pode excluir a si mesmo
    if (usuario.authUserId === sessao.userId) {
      return Response.json({ error: "Você não pode excluir a si mesmo." }, { status: 400 });
    }

    // Se há destino para migração, migrar leads e propostas
    if (migrateToId) {
      const destino = await prisma.usuarioPerfil.findFirst({
        where: { id: migrateToId, empresaId: sessao.empresaId },
      });
      if (!destino) return Response.json({ error: "Usuário de destino não encontrado" }, { status: 404 });

      // Migrar leads
      await prisma.lead.updateMany({
        where: { vendedorEmail: usuario.email, empresaId: sessao.empresaId },
        data: { vendedorEmail: destino.email, vendedorNome: destino.nome }
      });

      // Migrar propostas
      await prisma.proposta.updateMany({
        where: { vendedorEmail: usuario.email, empresaId: sessao.empresaId },
        data: { vendedorEmail: destino.email, vendedorNome: destino.nome }
      });
    }

    // Excluir o perfil do banco local
    await prisma.usuarioPerfil.delete({ where: { id } });

    // Opcional: desativar no Supabase Auth
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      // Ban user ao invés de deletar (para manter auditoria)
      await supabaseAdmin.auth.admin.updateUserById(usuario.authUserId, { ban_duration: "876000h" });
    } catch { /* silenciar erro auth */ }

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
