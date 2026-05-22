import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao || sessao.perfilSlug !== "admin") {
      return Response.json({ error: "Não autorizado. Apenas admins podem alterar regras." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      tipoRemuneracao,
      baseCalculoComissao,
      salarioFixo,
      percentualFixo,
      regrasFaixas
    } = body;

    const user = await prisma.usuarioPerfil.update({
      where: { id, empresaId: sessao.empresaId },
      data: {
        tipoRemuneracao,
        baseCalculoComissao,
        salarioFixo: salarioFixo ? Number(salarioFixo) : null,
        percentualFixo: percentualFixo ? Number(percentualFixo) : null,
        regrasFaixas: regrasFaixas ? regrasFaixas : null,
      }
    });

    return Response.json(user);
  } catch (e: any) {
    return Response.json({ error: "Erro interno do servidor" }, { status: 400 });
  }
}
