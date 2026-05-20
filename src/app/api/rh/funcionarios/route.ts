import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET /api/rh/funcionarios — listar funcionários
export async function GET() {
  const sessao = await getSessionEmpresa();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(funcionarios);
}

// POST /api/rh/funcionarios — criar funcionário
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresa();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  // Validação básica
  if (!body.nome || !body.cpf || !body.regimeContratacao) {
    return NextResponse.json({ error: "Nome, CPF e Regime são obrigatórios" }, { status: 400 });
  }

  // Verificar duplicidade de CPF na empresa
  const existe = await prisma.funcionario.findFirst({
    where: { empresaId: sessao.empresaId, cpf: body.cpf },
  });
  if (existe) {
    return NextResponse.json({ error: "Já existe um funcionário com este CPF" }, { status: 409 });
  }

  const funcionario = await prisma.funcionario.create({
    data: {
      empresaId: sessao.empresaId,
      // Dados Pessoais
      nome: body.nome,
      cpf: body.cpf,
      rg: body.rg || null,
      dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : null,
      telefone: body.telefone || null,
      email: body.email || null,
      genero: body.genero || null,
      estadoCivil: body.estadoCivil || null,
      escolaridade: body.escolaridade || null,
      nomeMae: body.nomeMae || null,
      // Endereço
      cep: body.cep || null,
      logradouro: body.logradouro || null,
      numero: body.numero || null,
      complemento: body.complemento || null,
      bairro: body.bairro || null,
      cidade: body.cidade || null,
      uf: body.uf || null,
      // Regime
      regimeContratacao: body.regimeContratacao,
      // CLT
      ctpsNumero: body.ctpsNumero || null,
      ctpsSerie: body.ctpsSerie || null,
      pisPasep: body.pisPasep || null,
      dataAdmissao: body.dataAdmissao ? new Date(body.dataAdmissao) : null,
      dataDemissao: body.dataDemissao ? new Date(body.dataDemissao) : null,
      // Função
      cargoFuncao: body.cargoFuncao || null,
      cbo: body.cbo || null,
      tipoJornada: body.tipoJornada || "PADRAO_8H",
      horasDiarias: body.horasDiarias ?? 8,
      horasSemanais: body.horasSemanais ?? 44,
      // Remuneração
      salarioBase: body.salarioBase ?? null,
      valeTransporte: body.valeTransporte ?? false,
      valeAlimentacao: body.valeAlimentacao ?? null,
      planoSaude: body.planoSaude ?? false,
      tipoComissao: body.tipoComissao || null,
      percentualComissao: body.percentualComissao ?? null,
      // PJ
      cnpjPj: body.cnpjPj || null,
      razaoSocialPj: body.razaoSocialPj || null,
      valorMensalPj: body.valorMensalPj ?? null,
      // Sindicato
      sindicatoNome: body.sindicatoNome || null,
      cctVigente: body.cctVigente || null,
      pisoSalarialCct: body.pisoSalarialCct ?? null,
      // Estágio
      instituicaoEnsino: body.instituicaoEnsino || null,
      cursoEstagio: body.cursoEstagio || null,
      bolsaAuxilio: body.bolsaAuxilio ?? null,
      dataFimEstagio: body.dataFimEstagio ? new Date(body.dataFimEstagio) : null,
      // Banco
      bancoNome: body.bancoNome || null,
      bancoAgencia: body.bancoAgencia || null,
      bancoConta: body.bancoConta || null,
      bancoTipoConta: body.bancoTipoConta || null,
      chavePix: body.chavePix || null,
      // Risco
      nivelRisco: body.nivelRisco || "BAIXO",
      passivoEstimado: body.passivoEstimado ?? 0,
      observacoes: body.observacoes || null,
    },
  });

  return NextResponse.json(funcionario, { status: 201 });
}
