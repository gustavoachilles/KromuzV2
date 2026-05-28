import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { scrapeBeviTabelas } from "@/lib/bevi";
import { getSessionEmpresaApi } from "@/lib/session";

type BancoConfig = {
  financeira: string;
  convenio: string;
  formaContrato: string;
  ativo: boolean;
};

/**
 * POST /api/sync-tabelas/executar
 * Executa o scraping para uma ou todas as financeiras selecionadas.
 * Body: { financeira?: string } — se vazio, executa todas as ativas
 */
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const empresaId = sessao.empresaId;

    const body = await req.json().catch(() => ({}));
    const filtroFinanceira = body.financeira as string | undefined;

    // Load config
    const config = await prisma.syncTabelaConfig.findUnique({ where: { empresaId } });
    if (!config) {
      return NextResponse.json({ error: "Configure suas credenciais primeiro" }, { status: 400 });
    }

    // Decrypt credentials
    let login: string, senha: string, senhaRelatorio: string;
    try {
      login = decrypt(config.loginBevi);
      senha = decrypt(config.senhaBevi);
      senhaRelatorio = decrypt(config.senhaRelatorio);
    } catch {
      return NextResponse.json({ error: "Erro ao descriptografar credenciais" }, { status: 500 });
    }

    // Get banks to sync
    const bancos = (config.bancosSelecionados as BancoConfig[]).filter(b => b.ativo);
    const bancosParaSync = filtroFinanceira
      ? bancos.filter(b => b.financeira.toUpperCase() === filtroFinanceira.toUpperCase())
      : bancos;

    if (bancosParaSync.length === 0) {
      return NextResponse.json({ error: "Nenhum banco selecionado para sincronizar" }, { status: 400 });
    }

    // Update status
    await prisma.syncTabelaConfig.update({
      where: { empresaId },
      data: { statusSync: "running", erroSync: null },
    });

    const results: Array<{
      financeira: string;
      convenio: string;
      formaContrato: string;
      status: string;
      tabelas: number;
      inseridas: number;
      atualizadas: number;
      erro?: string;
      tempoMs: number;
    }> = [];

    // Process each bank sequentially
    for (const banco of bancosParaSync) {
      const startTime = Date.now();
      try {
        const result = await scrapeBeviTabelas(login, senha, senhaRelatorio, {
          financeira: banco.financeira,
          convenio: banco.convenio,
          formaContrato: banco.formaContrato,
        });

        if (!result.meta.loginOk) {
          throw new Error("Falha no login do Bevi");
        }

        // Find or create banco entity
        let bancoEntity = await prisma.banco.findFirst({
          where: { empresaId, nome: { contains: banco.financeira, mode: "insensitive" } },
        });
        if (!bancoEntity) {
          bancoEntity = await prisma.banco.create({
            data: { empresaId, nome: `${banco.financeira} FINANCEIRA`, tipo: "consignado", tipoBanco: "consignado" },
          });
        }

        // Find or create convenio
        let convenioEntity = await prisma.convenio.findFirst({
          where: { empresaId, slug: banco.convenio.toLowerCase() },
        });
        if (!convenioEntity) {
          convenioEntity = await prisma.convenio.create({
            data: { empresaId, nome: banco.convenio, slug: banco.convenio.toLowerCase(), tipo: "federal" },
          });
        }

        // Find or create produto
        let produto = await prisma.produtoCredito.findFirst({
          where: { empresaId, bancoId: bancoEntity.id, tipoProduto: "EMPRESTIMO_CONSIGNADO", convenioId: convenioEntity.id },
        });
        if (!produto) {
          produto = await prisma.produtoCredito.create({
            data: {
              empresaId, bancoId: bancoEntity.id, convenioId: convenioEntity.id,
              nomeProduto: `${banco.financeira} - Emp. Consignado ${banco.convenio}`,
              tipoProduto: "EMPRESTIMO_CONSIGNADO",
            },
          });
        }

        // Upsert tabelas
        let inseridas = 0, atualizadas = 0;
        for (const tabela of result.tabelas) {
          try {
            const existing = await prisma.tabelaCoeficiente.findFirst({
              where: { empresaId, bancoId: bancoEntity.id, produtoId: produto.id, nome: { contains: tabela.codigoTabela } },
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
              atualizadas++;
            } else {
              await prisma.tabelaCoeficiente.create({
                data: { ...data, empresaId, bancoId: bancoEntity.id, produtoId: produto.id, convenioId: convenioEntity.id },
              });
              inseridas++;
            }
          } catch {}
        }

        const elapsed = Date.now() - startTime;
        results.push({
          financeira: banco.financeira,
          convenio: banco.convenio,
          formaContrato: banco.formaContrato,
          status: "success",
          tabelas: result.tabelas.length,
          inseridas,
          atualizadas,
          tempoMs: elapsed,
        });

        // Log
        await prisma.syncTabelaLog.create({
          data: {
            configId: config.id,
            financeira: banco.financeira,
            convenio: banco.convenio,
            formaContrato: banco.formaContrato,
            status: "success",
            tabelasTotal: result.tabelas.length,
            inseridas,
            atualizadas,
            tempoMs: elapsed,
          },
        });
      } catch (err: any) {
        const elapsed = Date.now() - startTime;
        const erro = err.message || String(err);
        results.push({
          financeira: banco.financeira,
          convenio: banco.convenio,
          formaContrato: banco.formaContrato,
          status: "error",
          tabelas: 0,
          inseridas: 0,
          atualizadas: 0,
          erro,
          tempoMs: elapsed,
        });

        await prisma.syncTabelaLog.create({
          data: {
            configId: config.id,
            financeira: banco.financeira,
            convenio: banco.convenio,
            formaContrato: banco.formaContrato,
            status: "error",
            erro,
            tempoMs: elapsed,
          },
        });
      }
    }

    // Update final status
    const hasErrors = results.some(r => r.status === "error");
    const allErrors = results.every(r => r.status === "error");
    await prisma.syncTabelaConfig.update({
      where: { empresaId },
      data: {
        ultimaSync: new Date(),
        statusSync: allErrors ? "error" : hasErrors ? "partial" : "success",
        erroSync: allErrors ? results[0]?.erro : null,
      },
    });

    const totalTabelas = results.reduce((s, r) => s + r.tabelas, 0);
    const totalInseridas = results.reduce((s, r) => s + r.inseridas, 0);
    const totalAtualizadas = results.reduce((s, r) => s + r.atualizadas, 0);

    return NextResponse.json({
      success: !allErrors,
      message: `${totalTabelas} tabelas processadas (${totalInseridas} novas, ${totalAtualizadas} atualizadas)`,
      results,
      totals: { tabelas: totalTabelas, inseridas: totalInseridas, atualizadas: totalAtualizadas },
    });
  } catch (error: any) {
    console.error("[SyncExecutar]", error);

    // Try to reset status
    try {
      const sessao2 = await getSessionEmpresaApi();
      if (sessao2) {
        await prisma.syncTabelaConfig.update({
          where: { empresaId: sessao2.empresaId },
          data: { statusSync: "error", erroSync: error.message || String(error) },
        });
      }
    } catch {}

    return NextResponse.json({ error: "Erro interno", details: String(error) }, { status: 500 });
  }
}
