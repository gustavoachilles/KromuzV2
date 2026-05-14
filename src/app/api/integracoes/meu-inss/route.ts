import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const { empresaId } = sessao;

    const data = await req.json();
    const { leadId, cpf, senha } = data;

    if (!leadId || !cpf || !senha) {
      return NextResponse.json({ error: "Faltam parâmetros obrigatórios" }, { status: 400 });
    }

    // Cria a tarefa na Fila RPA
    const tarefa = await prisma.filaRpa.create({
      data: {
        empresaId,
        tipo: "EXTRACAO_INSS",
        referenciaId: leadId,
        payload: { cpf, senha }, // A senha seria idealmente criptografada aqui
        status: "PENDENTE"
      }
    });

    // TODO: Aqui é onde dispararíamos um webhook para um microserviço Python (Celery/Playwright)
    // ou para a API terceira (ex: IntegraFácil).
    // fetch('https://nosso-worker-python.com/api/start-inss-job', { ... })

    return NextResponse.json({ success: true, jobId: tarefa.id });
  } catch (error: any) {
    console.error("Erro na integração INSS:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
