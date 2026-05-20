import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { temPermissao } from "@/lib/permissions";

// M2: Helper para obter data de hoje no timezone do Brasil
function getHojeBrasil(): Date {
  const agora = new Date();
  const dateStr = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(dateStr + "T00:00:00.000Z");
}

// POST /api/rh/ponto — registrar batida
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!temPermissao(null, "rh", sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { funcionarioId, tipo } = await req.json();

    if (!funcionarioId || !tipo) {
      return NextResponse.json({ error: "funcionarioId e tipo são obrigatórios" }, { status: 400 });
    }

    // Validar tipo
    const tiposValidos = ["entrada", "saida_almoco", "retorno_almoco", "saida"];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({ error: "Tipo de batida inválido" }, { status: 400 });
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

    // M2: Usar timezone do Brasil
    const hoje = getHojeBrasil();
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
    }

    const updated = await prisma.registroPonto.update({
      where: { id: registro.id },
      data: updates,
      include: { pausas: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[RH/ponto] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao registrar ponto" }, { status: 500 });
  }
}
