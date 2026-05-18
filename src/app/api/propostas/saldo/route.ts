import { NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    const body = await req.json();
    const { propostaId, saldoRetornado, saldoDevedor, dataProximoRetorno, bancoOrigem, dataSolicitacaoSaldo } = body;

    if (!propostaId) {
      return NextResponse.json({ error: "propostaId obrigatório" }, { status: 400 });
    }

    // Verificar que a proposta pertence à empresa
    const proposta = await prisma.proposta.findFirst({
      where: { id: propostaId, empresaId: sessao.empresaId },
    });

    if (!proposta) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    const updateData: any = {};

    if (saldoRetornado !== undefined) {
      updateData.saldoRetornado = saldoRetornado;
      if (saldoRetornado) {
        updateData.dataRetornoSaldo = new Date();
      }
    }

    if (saldoDevedor !== undefined) updateData.saldoDevedor = saldoDevedor;
    if (dataProximoRetorno !== undefined) updateData.dataProximoRetorno = dataProximoRetorno ? new Date(dataProximoRetorno) : null;
    if (bancoOrigem !== undefined) updateData.bancoOrigem = bancoOrigem;
    if (dataSolicitacaoSaldo !== undefined) updateData.dataSolicitacaoSaldo = dataSolicitacaoSaldo ? new Date(dataSolicitacaoSaldo) : null;

    const updated = await prisma.proposta.update({
      where: { id: propostaId },
      data: updateData,
    });

    return NextResponse.json({ success: true, proposta: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar saldo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
