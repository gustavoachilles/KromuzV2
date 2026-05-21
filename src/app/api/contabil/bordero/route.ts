import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — Lista todos os borderôs enviados
export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const borderos = await prisma.borderoUpload.findMany({
      where: { empresaId: sessao.empresaId },
      include: { _count: { select: { linhas: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(borderos);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar borderôs" }, { status: 500 });
  }
}

// Fuzzy match helper — compara similaridade entre strings (Levenshtein simplificado)
function similaridade(a: string, b: string): number {
  const sa = a.replace(/\D/g, "");
  const sb = b.replace(/\D/g, "");
  if (sa === sb && sa.length > 0) return 100;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 100;
  if (la.includes(lb) || lb.includes(la)) return 85;
  // Distância simples por caractere
  let matches = 0;
  const shorter = la.length <= lb.length ? la : lb;
  const longer = la.length <= lb.length ? lb : la;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return Math.round((matches / longer.length) * 100);
}

// POST — Upload e processamento de borderô
// Body: { bancoNome, linhas: [{ cpfCliente, nomeCliente, contrato, valorLiberado, valorComissao, produto }] }
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { bancoNome, nomeArquivo, linhas } = body;

    if (!bancoNome || !linhas || !Array.isArray(linhas) || linhas.length === 0) {
      return NextResponse.json({ error: "Dados do borderô inválidos" }, { status: 400 });
    }

    const totalValor = linhas.reduce((s: number, l: any) => s + (l.valorComissao || 0), 0);

    // Criar o upload
    const bordero = await prisma.borderoUpload.create({
      data: {
        empresaId: sessao.empresaId,
        bancoNome,
        nomeArquivo: nomeArquivo || `bordero_${bancoNome.toLowerCase().replace(/\s/g, "_")}_${Date.now()}.csv`,
        totalLinhas: linhas.length,
        totalValor,
        enviadoPor: sessao.email,
      },
    });

    // Buscar todas as propostas da empresa para matching
    const propostas = await prisma.proposta.findMany({
      where: { empresaId: sessao.empresaId },
      select: {
        id: true, cpf: true, nomeCliente: true, valorLiberado: true,
        valorComissao: true, status: true, banco: true, contrato: true,
      },
    });

    let matchEncontrados = 0;
    let matchNaoEncontrados = 0;
    const linhasParaCriar = [];

    for (const linha of linhas) {
      let melhorMatch: any = null;
      let melhorScore = 0;
      let divergencia: string | null = null;

      for (const prop of propostas) {
        let score = 0;

        // Match por CPF (mais confiável)
        if (linha.cpfCliente && prop.cpf) {
          const cpfScore = similaridade(linha.cpfCliente, prop.cpf);
          if (cpfScore === 100) score += 50;
          else score += cpfScore * 0.3;
        }

        // Match por contrato
        if (linha.contrato && prop.contrato) {
          const contratoScore = similaridade(linha.contrato, prop.contrato);
          if (contratoScore === 100) score += 30;
          else score += contratoScore * 0.2;
        }

        // Match por nome
        if (linha.nomeCliente && prop.nomeCliente) {
          score += similaridade(linha.nomeCliente, prop.nomeCliente) * 0.2;
        }

        if (score > melhorScore) {
          melhorScore = score;
          melhorMatch = prop;
        }
      }

      let statusMatch = "NAO_ENCONTRADO";
      if (melhorScore >= 80) {
        statusMatch = "MATCH_EXATO";
        matchEncontrados++;
        // Verificar divergência de valor
        if (melhorMatch && linha.valorComissao && melhorMatch.valorComissao) {
          const diff = Math.abs(linha.valorComissao - melhorMatch.valorComissao);
          if (diff > 0.01) {
            statusMatch = "DIVERGENCIA";
            divergencia = `Comissão banco: R$${linha.valorComissao?.toFixed(2)} vs Esteira: R$${melhorMatch.valorComissao?.toFixed(2)}`;
          }
        }
      } else if (melhorScore >= 50) {
        statusMatch = "MATCH_FUZZY";
        matchEncontrados++;
      } else {
        matchNaoEncontrados++;
      }

      linhasParaCriar.push({
        borderoId: bordero.id,
        cpfCliente: linha.cpfCliente || null,
        nomeCliente: linha.nomeCliente || null,
        contrato: linha.contrato || null,
        valorLiberado: linha.valorLiberado || null,
        valorComissao: linha.valorComissao || null,
        dataPagamento: linha.dataPagamento ? new Date(linha.dataPagamento) : null,
        produto: linha.produto || null,
        statusMatch,
        propostaId: melhorScore >= 50 ? melhorMatch?.id : null,
        scoreSimilaridade: melhorScore,
        divergencia,
      });
    }

    // Criar todas as linhas
    await prisma.borderoLinha.createMany({ data: linhasParaCriar });

    // Atualizar o borderô com os resultados
    await prisma.borderoUpload.update({
      where: { id: bordero.id },
      data: { matchEncontrados, matchNaoEncontrados, status: "CONCLUIDO" },
    });

    return NextResponse.json({
      id: bordero.id,
      totalLinhas: linhas.length,
      matchEncontrados,
      matchNaoEncontrados,
      totalValor,
      status: "CONCLUIDO",
    }, { status: 201 });
  } catch (e) {
    console.error("Erro borderô:", e);
    return NextResponse.json({ error: "Erro ao processar borderô" }, { status: 500 });
  }
}

// DELETE — Exclui um borderô e todas as linhas
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    const existing = await prisma.borderoUpload.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.borderoUpload.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
