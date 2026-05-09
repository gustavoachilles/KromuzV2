import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();

    const fatura = await prisma.faturaBanco.updateMany({
      where: {
        id: params.id,
        empresaId: sessao.empresaId,
      },
      data: {
        status: body.status,
        dataPagamento: body.status === "PAGA" ? new Date() : null,
      }
    });

    if (fatura.count === 0) {
      return NextResponse.json({ error: "Fatura não encontrada ou não autorizada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const fatura = await prisma.faturaBanco.deleteMany({
      where: {
        id: params.id,
        empresaId: sessao.empresaId,
        status: "PENDENTE"
      }
    });

    if (fatura.count === 0) {
      return NextResponse.json({ error: "Fatura não encontrada, já paga ou não autorizada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
