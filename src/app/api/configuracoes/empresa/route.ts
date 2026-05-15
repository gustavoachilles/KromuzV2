import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function PATCH(req: Request) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Campos permitidos para atualização
    const allowed = [
      "nomeEmpresa", "nomeFantasia", "logoUrl", "corPrimaria",
      "cpfCnpj", "telefone", "email",
      "inscricaoEstadual", "inscricaoMunicipal",
      "cep", "logradouro", "numero", "complemento",
      "bairro", "cidade", "uf"
    ];

    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    const empresa = await prisma.empresa.update({
      where: { id: sessao.empresaId },
      data
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
        detalhes: { nomeEmpresa: data.nomeEmpresa, corPrimaria: data.corPrimaria }
      }
    });

    return NextResponse.json(empresa);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
