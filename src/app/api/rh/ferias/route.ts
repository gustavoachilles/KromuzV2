import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// POST /api/rh/ferias — agendar férias
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresa();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

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

  // Calcular período aquisitivo atual
  const admissao = new Date(func.dataAdmissao);
  const agora = new Date();
  const meses = Math.floor((agora.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const anosCompletos = Math.floor(meses / 12);

  if (anosCompletos < 1) {
    return NextResponse.json({ error: "Funcionário ainda não completou período aquisitivo (12 meses)" }, { status: 400 });
  }

  // Período aquisitivo mais recente sem férias
  const periodoInicio = new Date(admissao);
  periodoInicio.setFullYear(periodoInicio.getFullYear() + (anosCompletos - 1));
  const periodoFim = new Date(periodoInicio);
  periodoFim.setFullYear(periodoFim.getFullYear() + 1);
  const concessivoFim = new Date(periodoFim);
  concessivoFim.setFullYear(concessivoFim.getFullYear() + 1);

  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const diasGozo = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  const abono = Math.min(diasVendidos || 0, 10);

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
}
