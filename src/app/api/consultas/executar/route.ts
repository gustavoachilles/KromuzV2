import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/consultas/executar
 * 
 * Orquestrador de Consultas — recebe solicitação de consulta (INSS, FGTS, CLT)
 * e cria uma tarefa na FilaRpa para ser processada pelo worker/robô.
 * 
 * Este mesmo endpoint é usado tanto pela Mesa do Operador (consulta manual)
 * quanto pela IA do WhatsApp (consulta automática).
 */
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const { empresaId } = sessao;

    const data = await req.json();
    const { tipo, cpf, telefone, dataNascimento, origem = "MESA" } = data;

    // Validações
    if (!tipo || !["INSS", "FGTS", "CLT"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo de consulta inválido. Use: INSS, FGTS ou CLT." }, { status: 400 });
    }

    const cpfLimpo = cpf?.replace(/\D/g, "");
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }

    if ((tipo === "FGTS" || tipo === "CLT") && !dataNascimento) {
      return NextResponse.json({ error: "Data de nascimento é obrigatória para consultas FGTS/CLT." }, { status: 400 });
    }

    if ((tipo === "FGTS" || tipo === "CLT") && !telefone) {
      return NextResponse.json({ error: "Telefone é obrigatório para consultas FGTS/CLT." }, { status: 400 });
    }

    // Buscar ou criar lead vinculado ao CPF
    let lead = await prisma.lead.findFirst({
      where: { empresaId, cpf: cpfLimpo },
      orderBy: { updatedAt: "desc" },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          empresaId,
          nome: `Consulta ${tipo} — ${cpfLimpo}`,
          cpf: cpfLimpo,
          telefone: telefone?.replace(/\D/g, "") || null,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
          status: "NOVO",
          origem: `CONSULTA_${tipo}`,
          canalContato: origem === "WHATSAPP" ? "whatsapp" : "presencial",
        },
      });
    }

    // Criar tarefa na fila do RPA
    const tipoRpa = `CONSULTA_${tipo}`;
    const tarefa = await prisma.filaRpa.create({
      data: {
        empresaId,
        tipo: tipoRpa,
        referenciaId: lead.id,
        payload: {
          tipoConsulta: tipo,
          cpf: cpfLimpo,
          telefone: telefone?.replace(/\D/g, "") || null,
          dataNascimento: dataNascimento || null,
          origem,
        },
        status: "PENDENTE",
      },
    });

    // TODO: Disparar worker externo que executa a consulta no portal
    // await fetch(process.env.RPA_WORKER_URL + '/consultar', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RPA_SECRET}` },
    //   body: JSON.stringify({ jobId: tarefa.id, tipo, cpf: cpfLimpo, telefone, dataNascimento }),
    // });

    return NextResponse.json({
      success: true,
      jobId: tarefa.id,
      leadId: lead.id,
      message: `Consulta ${tipo} enviada para processamento.`,
    });
  } catch (error: any) {
    console.error("Erro na consulta:", error);
    return NextResponse.json({ error: "Erro interno ao processar consulta." }, { status: 500 });
  }
}
