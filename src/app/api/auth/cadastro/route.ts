import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { createAsaasCustomer } from "@/lib/asaas";

export async function POST(req: Request) {
  try {
    const { email, password, nome, empresa } = await req.json();

    if (!email || !password || !nome || !empresa) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    // Bypass de Rate Limit: Usamos o Service Role Key para criar o usuário via Admin API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let authData, authError;

    // Tenta via Admin (não sofre Rate Limit e auto-confirma)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) {
      const res = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, empresa },
      });
      authData = res.data;
      authError = res.error;
    } else {
      // Fallback para signUp normal se a chave Admin não estiver no .env
      const res = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: { data: { nome, empresa } },
      });
      authData = res.data;
      authError = res.error;
    }

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Erro ao criar usuário" }, { status: 400 });
    }

    // Verifica se já existe um perfil (caso haja trigger). Se sim, atualizamos. Se não, criamos.
    let perfil = await prisma.usuarioPerfil.findUnique({
      where: { authUserId: authData.user.id }
    });

    let empresaId = perfil?.empresaId;

    if (!perfil) {
      // 2. Criar a Empresa
      const novaEmpresa = await prisma.empresa.create({
        data: {
          nomeEmpresa: empresa,
          status: "TRIAL",
          statusAssinatura: "ACTIVE"
        }
      });
      empresaId = novaEmpresa.id;

      // 3. Criar o Perfil de Administrador (Dono)
      perfil = await prisma.usuarioPerfil.create({
        data: {
          authUserId: authData.user.id,
          empresaId: novaEmpresa.id,
          email: email,
          nome: nome,
          perfilSlug: "admin", // O primeiro usuário é o dono
        }
      });
    }

    // 4. Integração com Asaas (Customer)
    if (empresaId) {
      try {
        const asaasCustomer = await createAsaasCustomer(empresa, "", email);
        
        await prisma.empresa.update({
          where: { id: empresaId },
          data: { asaasCustomerId: asaasCustomer.id }
        });
      } catch (asaasErr) {
        console.error("Aviso: Falha ao criar cliente Asaas, mas cadastro prosseguiu.", asaasErr);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erro no cadastro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
