import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { temPermissao } from "@/lib/permissions";

// POST /api/rh/ferias — agendar férias
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!temPermissao(null, "rh", sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { funcionarioId, dataInicio, dataFim, diasVendidos } = await req.json();

    if (!funcionarioId || !dataInicio || !dataFim) {
      return NextResponse.json({ error: "Campos obrigatórios: funcionarioId, dataInicio, dataFim" }, { status: 400 });
    }

    // Verificar funcionário
    const func = await prisma.funcionario.findFirst({
      where: { id: funcionarioId, empresaId: sessao.empresaId, regimeContratacao: "CLT" },
    });
    if (!func) return NextResponse.json({ error: "Funcionário CLT não encontrado" }, { status: 404 });
    if (!func.dataAdmissao) return NextResponse.json({ error: "Data de admissão não cadastrada" }, { status: 400 });

    // Validar datas
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    if (fim <= inicio) {
      return NextResponse.json({ error: "Data fim deve ser posterior à data início" }, { status: 400 });
    }

    const diasGozo = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    if (diasGozo < 5) {
      return NextResponse.json({ error: "O período mínimo de férias é de 5 dias (Art. 134 §1º CLT)" }, { status: 400 });
    }
    if (diasGozo > 30) {
      return NextResponse.json({ error: "O período máximo de férias é de 30 dias" }, { status: 400 });
    }

    // Validar abono pecuniário (máximo 1/3 = 10 dias)
    const abono = Math.min(Math.max(0, diasVendidos || 0), 10);

    // Calcular período aquisitivo atual
    const admissao = new Date(func.dataAdmissao);
    const agora = new Date();
    const meses = Math.floor((agora.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const anosCompletos = Math.floor(meses / 12);

    if (anosCompletos < 1) {
      return NextResponse.json({ error: "Funcionário ainda não completou período aquisitivo (12 meses)" }, { status: 400 });
    }

    // Período aquisitivo mais recente
    const periodoInicio = new Date(admissao);
    periodoInicio.setFullYear(periodoInicio.getFullYear() + (anosCompletos - 1));
    const periodoFim = new Date(periodoInicio);
    periodoFim.setFullYear(periodoFim.getFullYear() + 1);
    const concessivoFim = new Date(periodoFim);
    concessivoFim.setFullYear(concessivoFim.getFullYear() + 1);

    // A4: Verificar se já existe férias para este período aquisitivo
    const feriasExistente = await prisma.feriasFuncionario.findFirst({
      where: {
        funcionarioId,
        periodoAquisitivoInicio: periodoInicio,
        status: { in: ["AGENDADA", "EM_GOZO", "GOZADA"] },
      },
    });
    if (feriasExistente) {
      return NextResponse.json({
        error: "Já existem férias agendadas/gozadas para este período aquisitivo",
      }, { status: 409 });
    }

    // Verificar sobreposição de datas com outras férias
    const feriasConflito = await prisma.feriasFuncionario.findFirst({
      where: {
        funcionarioId,
        status: { in: ["AGENDADA", "EM_GOZO"] },
        OR: [
          { dataInicio: { lte: fim }, dataFim: { gte: inicio } },
        ],
      },
    });
    if (feriasConflito) {
      return NextResponse.json({
        error: "O período de férias conflita com outra férias já agendada",
      }, { status: 409 });
    }

    // Valor
    const salario = func.salarioBase || 0;
    const valorFerias = Math.round((salario / 30) * diasGozo * 100) / 100;
    const valorTerco = Math.round(valorFerias / 3 * 100) / 100;
    const pagoEmDobro = concessivoFim < agora;

    const ferias = await prisma.feriasFuncionario.create({
      data: {
        funcionarioId,
        periodoAquisitivoInicio: periodoInicio,
        periodoAquisitivoFim: periodoFim,
        periodoConcessivoFim: concessivoFim,
        diasDireito: 30,
        diasGozados: diasGozo,
        diasVendidos: abono,
        dataInicio: inicio,
        dataFim: fim,
        status: "AGENDADA",
        valorFerias: pagoEmDobro ? valorFerias * 2 : valorFerias,
        valorTerco: pagoEmDobro ? valorTerco * 2 : valorTerco,
        pagoEmDobro,
      },
    });

    return NextResponse.json(ferias, { status: 201 });
  } catch (error) {
    console.error("[RH/ferias] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao agendar férias" }, { status: 500 });
  }
}
