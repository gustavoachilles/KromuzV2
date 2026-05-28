import { NextRequest, NextResponse } from "next/server";
import { scrapeBeviTabelas } from "@/lib/bevi";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/scraper/bevi
 * 
 * Dispara o scraper do Bevi para extrair tabelas de comissão.
 * Salva os resultados na tabela TabelaCoeficiente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, senha, senhaRelatorio, empresaId, filtros } = body;

    if (!login || !senha || !senhaRelatorio || !empresaId) {
      return NextResponse.json(
        { error: "Campos obrigatórios: login, senha, senhaRelatorio, empresaId" },
        { status: 400 }
      );
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    const result = await scrapeBeviTabelas(
      login, senha, senhaRelatorio,
      filtros || { financeira: "FACTA", convenio: "INSS", formaContrato: "Novo" }
    );

    if (!result.meta.loginOk) {
      return NextResponse.json({ error: "Falha no login", details: result.errors }, { status: 401 });
    }

    if (result.tabelas.length === 0) {
      return NextResponse.json({ success: false, message: "Nenhuma tabela", errors: result.errors, meta: result.meta });
    }

    // Find or create banco
    const financeiraNome = filtros?.financeira || "FACTA";
    let banco = await prisma.banco.findFirst({
      where: { empresaId, nome: { contains: financeiraNome, mode: "insensitive" } },
    });
    if (!banco) {
      banco = await prisma.banco.create({
        data: { empresaId, nome: `${financeiraNome} FINANCEIRA`, tipo: "consignado", tipoBanco: "consignado", ativo: true },
      });
    }

    // Find or create convenio
    const convenioNome = filtros?.convenio || "INSS";
    let convenio = await prisma.convenio.findFirst({
      where: { empresaId, slug: convenioNome.toLowerCase() },
    });
    if (!convenio) {
      convenio = await prisma.convenio.create({
        data: { empresaId, nome: convenioNome, slug: convenioNome.toLowerCase(), tipo: "federal", ativo: true },
      });
    }

    // Find or create produto
    let produto = await prisma.produtoCredito.findFirst({
      where: { empresaId, bancoId: banco.id, tipoProduto: "EMPRESTIMO_CONSIGNADO", convenioId: convenio.id },
    });
    if (!produto) {
      produto = await prisma.produtoCredito.create({
        data: {
          empresaId, bancoId: banco.id, convenioId: convenio.id,
          nomeProduto: `${financeiraNome} - Emp. Consignado ${convenioNome}`,
          tipoProduto: "EMPRESTIMO_CONSIGNADO", ativo: true,
        },
      });
    }

    // Upsert tabelas
    let inserted = 0, updated = 0, skipped = 0;

    for (const tabela of result.tabelas) {
      try {
        const existing = await prisma.tabelaCoeficiente.findFirst({
          where: { empresaId, bancoId: banco.id, produtoId: produto.id, nome: { contains: tabela.codigoTabela } },
        });

        const data = {
          nome: tabela.nomeTabela,
          prazo: tabela.prazo,
          taxaJurosMensal: tabela.taxa,
          coeficiente: tabela.coeficiente,
          comissaoFlatPct: tabela.comissaoFlat,
          comissaoRepassePct: tabela.comissaoRepasse,
          ativo: true,
        };

        if (existing) {
          await prisma.tabelaCoeficiente.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.tabelaCoeficiente.create({
            data: { ...data, empresaId, bancoId: banco.id, produtoId: produto.id, convenioId: convenio.id },
          });
          inserted++;
        }
      } catch (err) {
        skipped++;
        console.error(`[Bevi] Erro tabela ${tabela.codigoTabela}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${inserted} inseridas, ${updated} atualizadas, ${skipped} puladas`,
      stats: { total: result.tabelas.length, inserted, updated, skipped },
      meta: result.meta,
    });
  } catch (error: unknown) {
    console.error("[Bevi API] Erro:", error);
    return NextResponse.json({ error: "Erro interno", details: String(error) }, { status: 500 });
  }
}
