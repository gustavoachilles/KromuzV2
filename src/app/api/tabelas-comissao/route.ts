import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// GET /api/tabelas-comissao — lista todas as tabelas de comissão da empresa
export async function GET() {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tabelas = await prisma.tabelaCoeficiente.findMany({
    where: { empresaId: sessao.empresaId },
    include: {
      banco: { select: { id: true, nome: true } },
      produto: { select: { id: true, nomeProduto: true, tipoProduto: true } },
      convenio: { select: { id: true, nome: true } },
    },
    orderBy: [{ banco: { nome: "asc" } }, { nome: "asc" }],
  });

  return NextResponse.json(tabelas);
}

// POST /api/tabelas-comissao — cria uma ou várias tabelas (batch)
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const items = Array.isArray(body) ? body : [body];
  const criadas = [];
  const atualizadas = [];
  const erros: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      // Validação mínima
      if (!item.bancoId) { erros.push(`Linha ${i + 1}: banco obrigatório`); continue; }
      if (!item.produtoId) { erros.push(`Linha ${i + 1}: produto obrigatório`); continue; }
      if (!item.nome?.trim()) { erros.push(`Linha ${i + 1}: nome obrigatório`); continue; }

      const data = {
        empresaId: sessao.empresaId,
        bancoId: item.bancoId,
        produtoId: item.produtoId,
        convenioId: item.convenioId || null,
        nome: item.nome.trim(),
        prazo: item.prazo ? parseInt(item.prazo) : 0,
        taxaJurosMensal: item.taxaJurosMensal ? parseFloat(item.taxaJurosMensal) : 0,
        coeficiente: item.coeficiente ? parseFloat(item.coeficiente) : 0,
        comissaoFlatPct: item.comissaoFlatPct ? parseFloat(item.comissaoFlatPct) : null,
        comissaoRepassePct: item.comissaoRepassePct ? parseFloat(item.comissaoRepassePct) : null,
        ativo: item.ativo !== false,
      };

      // Verificar duplicata (mesma empresa, banco, produto, nome)
      const existente = await prisma.tabelaCoeficiente.findFirst({
        where: {
          empresaId: sessao.empresaId,
          bancoId: data.bancoId,
          produtoId: data.produtoId,
          nome: data.nome,
        },
      });

      if (existente) {
        await prisma.tabelaCoeficiente.update({ where: { id: existente.id }, data });
        atualizadas.push(existente.id);
      } else {
        const nova = await prisma.tabelaCoeficiente.create({ data });
        criadas.push(nova.id);
      }
    } catch (e: any) {
      erros.push(`Linha ${i + 1}: ${e.message}`);
    }
  }

  return NextResponse.json({ criadas: criadas.length, atualizadas: atualizadas.length, erros });
}

// PUT /api/tabelas-comissao — atualiza uma tabela
export async function PUT(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const tabela = await prisma.tabelaCoeficiente.findFirst({
    where: { id: body.id, empresaId: sessao.empresaId },
  });
  if (!tabela) return NextResponse.json({ error: "Tabela não encontrada" }, { status: 404 });

  const atualizada = await prisma.tabelaCoeficiente.update({
    where: { id: body.id },
    data: {
      nome: body.nome?.trim() || tabela.nome,
      prazo: body.prazo !== undefined ? parseInt(body.prazo) : tabela.prazo,
      taxaJurosMensal: body.taxaJurosMensal !== undefined ? parseFloat(body.taxaJurosMensal) : tabela.taxaJurosMensal,
      coeficiente: body.coeficiente !== undefined ? parseFloat(body.coeficiente) : tabela.coeficiente,
      comissaoFlatPct: body.comissaoFlatPct !== undefined ? (body.comissaoFlatPct ? parseFloat(body.comissaoFlatPct) : null) : tabela.comissaoFlatPct,
      comissaoRepassePct: body.comissaoRepassePct !== undefined ? (body.comissaoRepassePct ? parseFloat(body.comissaoRepassePct) : null) : tabela.comissaoRepassePct,
      ativo: body.ativo !== undefined ? body.ativo : tabela.ativo,
      bancoId: body.bancoId || tabela.bancoId,
      produtoId: body.produtoId || tabela.produtoId,
      convenioId: body.convenioId !== undefined ? (body.convenioId || null) : tabela.convenioId,
    },
  });

  return NextResponse.json(atualizada);
}

// DELETE /api/tabelas-comissao?id=xxx
export async function DELETE(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const tabela = await prisma.tabelaCoeficiente.findFirst({
    where: { id, empresaId: sessao.empresaId },
  });
  if (!tabela) return NextResponse.json({ error: "Tabela não encontrada" }, { status: 404 });

  await prisma.tabelaCoeficiente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
