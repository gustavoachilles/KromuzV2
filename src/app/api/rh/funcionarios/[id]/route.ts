import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { temPermissao } from "@/lib/permissions";
import { calcularPassivoTrabalhista } from "@/lib/rh/calculos-trabalhistas";
import { registrarAudit, getIPFromRequest } from "@/lib/rh/audit";

// PUT /api/rh/funcionarios/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!temPermissao(null, "rh", sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão para acessar o módulo RH" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // C1: Verificar que o funcionário pertence à empresa do usuário
    const existente = await prisma.funcionario.findFirst({
      where: { id, empresaId: sessao.empresaId },
    });
    if (!existente) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }

    // A2: Verificar CPF duplicado na edição (se o CPF mudou)
    if (body.cpf && body.cpf !== existente.cpf) {
      const cpfDuplicado = await prisma.funcionario.findFirst({
        where: { empresaId: sessao.empresaId, cpf: body.cpf, id: { not: id } },
      });
      if (cpfDuplicado) {
        return NextResponse.json({ error: "Já existe outro funcionário com este CPF" }, { status: 409 });
      }
    }

    // B1: Auto-calcular passivo e nível de risco
    const salario = body.salarioBase ?? existente.salarioBase ?? 0;
    const meses = body.dataAdmissao || existente.dataAdmissao
      ? Math.max(1, Math.round((Date.now() - new Date(body.dataAdmissao || existente.dataAdmissao).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 1;
    const regime = body.regimeContratacao || existente.regimeContratacao;

    const passivo = calcularPassivoTrabalhista({
      salarioBase: salario || 1518,
      mesesTrabalhados: meses,
      regimeContratacao: regime,
      tipoJornada: body.tipoJornada || existente.tipoJornada || "PADRAO_8H",
      horasDiarias: body.horasDiarias ?? existente.horasDiarias ?? 8,
      regimeTributario: "SIMPLES_NACIONAL",
    });

    const funcionario = await prisma.funcionario.update({
      where: { id },
      data: {
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

    registrarAudit({
      empresaId: sessao.empresaId, usuarioId: sessao.userId, usuarioEmail: sessao.email,
      acao: "EDITAR_FUNCIONARIO", entidade: "Funcionario", entidadeId: id,
      descricao: `Editou funcionário ${body.nome}`,
      dadosAntes: { nome: existente.nome, regime: existente.regimeContratacao },
      dadosDepois: { nome: body.nome, regime: body.regimeContratacao },
      ipAddress: getIPFromRequest(req),
    });

    return NextResponse.json(funcionario);
  } catch (error) {
    console.error("[RH/funcionarios/PUT] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar funcionário" }, { status: 500 });
  }
}

// DELETE /api/rh/funcionarios/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!temPermissao(null, "rh", sessao.perfilSlug)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;

    // C1: Verificar ownership antes de deletar
    const func = await prisma.funcionario.findFirst({
      where: { id, empresaId: sessao.empresaId },
    });
    if (!func) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }

    // M4: Soft delete — marca como DESLIGADO ao invés de apagar
    await prisma.funcionario.update({
      where: { id },
      data: { status: "DESLIGADO", dataDemissao: new Date() },
    });

    registrarAudit({
      empresaId: sessao.empresaId, usuarioId: sessao.userId, usuarioEmail: sessao.email,
      acao: "EXCLUIR_FUNCIONARIO", entidade: "Funcionario", entidadeId: id,
      descricao: `Desligou funcionário ${func.nome}`,
      dadosAntes: { nome: func.nome, status: func.status },
      dadosDepois: { status: "DESLIGADO" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[RH/funcionarios/DELETE] Erro:", error);
    return NextResponse.json({ error: "Erro interno ao excluir funcionário" }, { status: 500 });
  }
}
