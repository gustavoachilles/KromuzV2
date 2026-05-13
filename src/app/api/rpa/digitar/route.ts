import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { empresaId } = await getSessionEmpresaApi();
    if (!empresaId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const data = await req.json();
    const { propostaId, banco } = data;

    if (!propostaId || !banco) {
      return NextResponse.json({ error: "Faltam parâmetros obrigatórios" }, { status: 400 });
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId, empresaId }
    });

    if (!proposta) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    // Cria a tarefa na Fila RPA
    const tarefa = await prisma.filaRpa.create({
      data: {
        empresaId,
        tipo: "DIGITACAO_PROPOSTA",
        referenciaId: propostaId,
        payload: { bancoDestino: banco, propostaDetalhes: proposta },
        status: "PENDENTE"
      }
    });

    // TODO: Disparar worker que executa o script do banco específico
    // fetch('https://nosso-worker.com/api/digitar-banco', { ... })

    return NextResponse.json({ success: true, jobId: tarefa.id });
  } catch (error: any) {
    console.error("Erro no RPA Digitação:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
