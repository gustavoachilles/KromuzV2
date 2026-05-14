import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const { empresaId, userId: usuarioId } = sessao;

    const data = await req.json();
    const { tipo, recurso, recursoId, descricao } = data;

    const log = await prisma.logAtividade.create({
      data: {
        empresaId,
        usuarioId,
        tipo,
        recurso,
        recursoId: String(recursoId),
        descricao,
        ip: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown"
      }
    });

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error: any) {
    console.error("Erro ao registrar log:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
