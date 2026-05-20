import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// PUT /api/rh/funcionarios/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessionEmpresa();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();

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
      nivelRisco: body.nivelRisco || "BAIXO",
      passivoEstimado: body.passivoEstimado ?? 0,
      observacoes: body.observacoes || null,
    },
  });

  return NextResponse.json(funcionario);
}

// DELETE /api/rh/funcionarios/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessionEmpresa();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  await prisma.funcionario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
