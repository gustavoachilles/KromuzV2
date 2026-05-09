import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAsaasCustomer } from "@/lib/asaas";

export async function POST(req: Request) {
  try {
    const { email, password, nome, empresa } = await req.json();

    if (!email || !password || !nome || !empresa) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 1. Criar usuário no Supabase Auth
    // Usamos admin ou o próprio signUp. Como estamos no server, signUp loga a sessão do server.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, empresa },
      },
    });

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
