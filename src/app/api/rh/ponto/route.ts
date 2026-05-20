import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// POST /api/rh/ponto — registrar batida
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresa();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { funcionarioId, tipo } = await req.json();

  if (!funcionarioId || !tipo) {
    return NextResponse.json({ error: "funcionarioId e tipo são obrigatórios" }, { status: 400 });
  }

  // Verificar que o funcionário pertence à empresa
  const func = await prisma.funcionario.findFirst({
    where: { id: funcionarioId, empresaId: sessao.empresaId },
  });
  if (!func) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  // PJ não pode bater ponto (proteção antifraude)
  if (func.regimeContratacao === "PJ") {
    return NextResponse.json({ error: "Pessoa Jurídica não pode registrar ponto — configura subordinação (Art. 3º CLT)" }, { status: 400 });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const agora = new Date();

  // Buscar ou criar registro do dia
  let registro = await prisma.registroPonto.findUnique({
    where: { funcionarioId_data: { funcionarioId, data: hoje } },
    include: { pausas: true },
  });

  if (!registro && tipo === "entrada") {
    registro = await prisma.registroPonto.create({
      data: { funcionarioId, data: hoje, entrada: agora },
      include: { pausas: true },
    });
    return NextResponse.json(registro);
  }

  if (!registro) {
    return NextResponse.json({ error: "Registre a entrada primeiro" }, { status: 400 });
  }

  // Atualizar conforme o tipo
  const updates: Record<string, unknown> = {};

  switch (tipo) {
    case "entrada":
      if (registro.entrada) return NextResponse.json({ error: "Entrada já registrada" }, { status: 400 });
      updates.entrada = agora;
      break;
    case "saida_almoco":
      if (!registro.entrada) return NextResponse.json({ error: "Registre a entrada primeiro" }, { status: 400 });
      if (registro.saidaAlmoco) return NextResponse.json({ error: "Saída para almoço já registrada" }, { status: 400 });
      updates.saidaAlmoco = agora;
      break;
    case "retorno_almoco":
      if (!registro.saidaAlmoco) return NextResponse.json({ error: "Registre a saída para almoço primeiro" }, { status: 400 });
      if (registro.retornoAlmoco) return NextResponse.json({ error: "Retorno do almoço já registrado" }, { status: 400 });
      updates.retornoAlmoco = agora;
      break;
    case "saida":
      if (!registro.entrada) return NextResponse.json({ error: "Registre a entrada primeiro" }, { status: 400 });
      if (registro.saida) return NextResponse.json({ error: "Saída já registrada" }, { status: 400 });
      updates.saida = agora;

      // Calcular horas trabalhadas
      const entrada = new Date(registro.entrada);
      let horas = (agora.getTime() - entrada.getTime()) / 3600000;

      if (registro.saidaAlmoco && registro.retornoAlmoco) {
        const almoco = (new Date(registro.retornoAlmoco).getTime() - new Date(registro.saidaAlmoco).getTime()) / 3600000;
        horas -= almoco;
      }

      horas = Math.max(0, Math.round(horas * 100) / 100);
      updates.horasTrabalhadas = horas;

      // Horas extras
      const limite = func.horasDiarias;
      updates.horasExtras = Math.max(0, Math.round((horas - limite) * 100) / 100);
      break;
    default:
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const updated = await prisma.registroPonto.update({
    where: { id: registro.id },
    data: updates,
    include: { pausas: true },
  });

  return NextResponse.json(updated);
}
