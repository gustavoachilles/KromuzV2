import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { temPermissao } from "@/lib/permissions";
import { calcularPassivoTrabalhista } from "@/lib/rh/calculos-trabalhistas";
import { registrarAudit, getIPFromRequest } from "@/lib/rh/audit";

// B2: Validador de CPF brasileiro
function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false; // todos iguais

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(limpo[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(limpo[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(limpo[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(limpo[10])) return false;

  return true;
}

// GET /api/rh/funcionarios — listar funcionários
export async function GET() {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!temPermissao(null, "rh", sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão para acessar o módulo RH" }, { status: 403 });
    }

    const funcionarios = await prisma.funcionario.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(funcionarios);
  } catch (error) {
    console.error("[RH/funcionarios/GET] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao listar funcionários" }, { status: 500 });
  }
}

// POST /api/rh/funcionarios — criar funcionário
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!temPermissao(null, "rh", sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão para acessar o módulo RH" }, { status: 403 });
    }

    const body = await req.json();

    // Validação básica
    if (!body.nome || !body.cpf || !body.regimeContratacao) {
      return NextResponse.json({ error: "Nome, CPF e Regime são obrigatórios" }, { status: 400 });
    }

    // B2: Validar formato do CPF
    if (!validarCPF(body.cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    // Validar regime
    const regimesValidos = ["CLT", "PJ", "ESTAGIARIO", "INFORMAL"];
    if (!regimesValidos.includes(body.regimeContratacao)) {
      return NextResponse.json({ error: "Regime de contratação inválido" }, { status: 400 });
    }

    // Verificar duplicidade de CPF na empresa
    const existe = await prisma.funcionario.findFirst({
      where: { empresaId: sessao.empresaId, cpf: body.cpf },
    });
    if (existe) {
      return NextResponse.json({ error: "Já existe um funcionário com este CPF" }, { status: 409 });
    }

    // B1: Auto-calcular passivo e nível de risco
    const salario = body.salarioBase || body.valorMensalPj || body.bolsaAuxilio || 1518;
    const meses = body.dataAdmissao
      ? Math.max(1, Math.round((Date.now() - new Date(body.dataAdmissao).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 1;

    const empresa = await prisma.empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { regimeTributario: true },
    });

    const passivo = calcularPassivoTrabalhista({
      salarioBase: salario,
      mesesTrabalhados: meses,
      regimeContratacao: body.regimeContratacao,
      tipoJornada: body.tipoJornada || "PADRAO_8H",
      horasDiarias: body.horasDiarias ?? 8,
      regimeTributario: empresa?.regimeTributario || "SIMPLES_NACIONAL",
    });

    const funcionario = await prisma.funcionario.create({
      data: {
        empresaId: sessao.empresaId,
        nome: body.nome,
        cpf: body.cpf.replace(/\D/g, ""), // Salvar apenas números
        rg: body.rg || null,
        dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : null,
        telefone: body.telefone || null,
        email: body.email || null,
        genero: body.genero || null,
        estadoCivil: body.estadoCivil || null,
        escolaridade: body.escolaridade || null,
        nomeMae: body.nomeMae || null,
        cep: body.cep || null,
        logradouro: body.logradouro || null,
        numero: body.numero || null,
        complemento: body.complemento || null,
        bairro: body.bairro || null,
        cidade: body.cidade || null,
        uf: body.uf || null,
        regimeContratacao: body.regimeContratacao,
        ctpsNumero: body.ctpsNumero || null,
        ctpsSerie: body.ctpsSerie || null,
        pisPasep: body.pisPasep || null,
        dataAdmissao: body.dataAdmissao ? new Date(body.dataAdmissao) : null,
        dataDemissao: body.dataDemissao ? new Date(body.dataDemissao) : null,
        cargoFuncao: body.cargoFuncao || null,
        cbo: body.cbo || null,
        tipoJornada: body.tipoJornada || "PADRAO_8H",
        horasDiarias: body.horasDiarias ?? 8,
        horasSemanais: body.horasSemanais ?? 44,
        salarioBase: body.salarioBase ?? null,
        valeTransporte: body.valeTransporte ?? false,
        valeAlimentacao: body.valeAlimentacao ?? null,
        planoSaude: body.planoSaude ?? false,
        tipoComissao: body.tipoComissao || null,
        percentualComissao: body.percentualComissao ?? null,
        cnpjPj: body.cnpjPj || null,
        razaoSocialPj: body.razaoSocialPj || null,
        valorMensalPj: body.valorMensalPj ?? null,
        sindicatoNome: body.sindicatoNome || null,
        cctVigente: body.cctVigente || null,
        pisoSalarialCct: body.pisoSalarialCct ?? null,
        instituicaoEnsino: body.instituicaoEnsino || null,
        cursoEstagio: body.cursoEstagio || null,
        bolsaAuxilio: body.bolsaAuxilio ?? null,
        dataFimEstagio: body.dataFimEstagio ? new Date(body.dataFimEstagio) : null,
        bancoNome: body.bancoNome || null,
        bancoAgencia: body.bancoAgencia || null,
        bancoConta: body.bancoConta || null,
        bancoTipoConta: body.bancoTipoConta || null,
        chavePix: body.chavePix || null,
        nivelRisco: passivo.nivelRisco,
        passivoEstimado: passivo.passivoTotal,
        observacoes: body.observacoes || null,
      },
    });

    // Audit log
    registrarAudit({
      empresaId: sessao.empresaId,
      usuarioId: sessao.userId,
      usuarioEmail: sessao.email,
      acao: "CRIAR_FUNCIONARIO",
      entidade: "Funcionario",
      entidadeId: funcionario.id,
      descricao: `Criou funcionário ${body.nome} (${body.regimeContratacao})`,
      dadosDepois: { nome: body.nome, cpf: body.cpf, regime: body.regimeContratacao },
      ipAddress: getIPFromRequest(req),
    });

    return NextResponse.json(funcionario, { status: 201 });
  } catch (error) {
    console.error("[RH/funcionarios/POST] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao criar funcionário" }, { status: 500 });
  }
}
