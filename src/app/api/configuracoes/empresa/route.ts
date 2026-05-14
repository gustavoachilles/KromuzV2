import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function PATCH(req: Request) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { nomeEmpresa, nomeFantasia, logoUrl, corPrimaria } = await req.json();

    const empresa = await prisma.empresa.update({
      where: { id: sessao.empresaId },
      data: {
        nomeEmpresa,
        nomeFantasia,
        logoUrl,
        corPrimaria
      }
    });

    // Registrar na auditoria
    await prisma.auditLog.create({
      data: {
        empresaId: sessao.empresaId,
        usuarioEmail: sessao.email || "Sistema",
        usuarioNome: sessao.nomeUsuario,
        acao: "Editou",
        entidade: "Configurações",
        entidadeNome: "Perfil da Empresa",
        detalhes: { nomeEmpresa, corPrimaria }
      }
    });

    return NextResponse.json(empresa);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
