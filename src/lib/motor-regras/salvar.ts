import { prisma } from "../prisma";
import type { TipoOperacao } from "@prisma/client";
import { normalizarTipoOperacao } from "./extrair";

export async function salvarRegrasNoBanco({
  empresaId,
  bancoIdInput,
  bancoNomeInput,
  importacaoPdfId,
  regras,
}: {
  empresaId: string;
  bancoIdInput?: string;
  bancoNomeInput?: string;
  importacaoPdfId?: string;
  regras: any[];
}) {
  let bancoId = bancoIdInput;
  let bancoNome = bancoNomeInput ?? "";

  // Resolve o banco — se não veio bancoId mas veio bancoNome, faz upsert.
  if (!bancoId) {
    if (!bancoNome) {
      return { ok: false, error: "banco_id ou banco_nome obrigatório" };
    }
    const novo = await prisma.banco.upsert({
      where: { empresaId_nome: { empresaId, nome: bancoNome } },
      update: { ativo: true },
      create: { empresaId, nome: bancoNome, ativo: true },
    });
    bancoId = novo.id;
  } else {
    const banco = await prisma.banco.findUnique({
      where: { id: bancoId },
      select: { nome: true, empresaId: true },
    });
    if (!banco || banco.empresaId !== empresaId) {
      return { ok: false, error: "Banco não pertence à empresa" };
    }
    bancoNome = banco.nome;
  }

  const salvas: Array<{ id: string; tipo: TipoOperacao; produto: string }> = [];
  const erros: Array<{ regra: number; erro: string }> = [];

  for (let i = 0; i < regras.length; i++) {
    const r = regras[i];
    const tipo = ((r.tipo_operacao_normalizado as TipoOperacao | null | undefined) ??
      (normalizarTipoOperacao(r.tipo_operacao) as TipoOperacao | null)) || null;
    if (!tipo) {
      erros.push({ regra: i, erro: `tipo_operacao inválido: ${r.tipo_operacao}` });
      continue;
    }

    // Resolve convênio (cria se não existir)
    let convenioId: string | null = r.sugestao_convenio_id ?? null;
    let convenioNome: string | null = r.convenio_nome ?? null;
    if (!convenioId && convenioNome) {
      const slug = convenioNome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 32);
      if (slug) {
        const conv = await prisma.convenio.upsert({
          where: { empresaId_slug: { empresaId, slug } },
          update: { nome: convenioNome },
          create: { empresaId, nome: convenioNome, slug, ativo: true },
        });
        convenioId = conv.id;
        convenioNome = conv.nome;
      }
    }

    // Resolve produto (cria se não existir)
    let produtoId = r.sugestao_produto_id ?? null;
    if (!produtoId) {
      const existente = await prisma.produtoCredito.findFirst({
        where: {
          empresaId,
          bancoId,
          tipoProduto: tipo,
          convenioId: convenioId ?? null,
        },
        select: { id: true },
      });
      if (existente) {
        produtoId = existente.id;
      } else {
        const novoProd = await prisma.produtoCredito.create({
          data: {
            empresaId,
            bancoId,
            convenioId: convenioId ?? undefined,
            nomeProduto: r.produto_nome_sugerido || tipo,
            tipoProduto: tipo,
            ativo: true,
          },
        });
        produtoId = novoProd.id;
      }
    }

    // Upsert da regra
    try {
      const dados = {
        empresaId,
        bancoId,
        bancoNome,
        produtoId,
        produtoNome: r.produto_nome_sugerido || tipo,
        convenioId: convenioId ?? null,
        convenioNome: convenioNome ?? null,
        tipoOperacao: tipo,
        ativa: true,
        faixasEtarias: r.faixas_etarias ?? [],
        especies: { aceitas: r.especies_aceitas ?? [], bloqueadas: r.especies_bloqueadas ?? [] },
        
        representanteLegalPermitido: r.representante_legal_permitido ?? null,
        idadeMaxRepresentante: r.idade_max_representante ?? null,
        analfabetoPermitido: r.analfabeto_permitido ?? null,
        ufBloqueadas: r.uf_bloqueadas ?? [],
        ddbMinimoDias: r.ddb_minimo_dias ?? null,

        margemPadraoPct: r.margem_padrao_pct ?? null,
        margemLoasPct: r.margem_loas_pct ?? null,
        margemNovaValorMin: r.valor_min ?? null,
        margemNovaValorMax: r.valor_max ?? null,
        refinParcelasMinPagas: r.parcelas_min_pagas ?? null,
        refinAgregaMargem: r.agrega_margem ?? null,
        refinPermiteMargemNeg: r.permite_margem_negativa ?? null,
        portParcelasMinPagas: r.parcelas_min_pagas ?? null,
        portPermiteReduzirParc: r.permite_reduzir_parcela ?? null,
        portPermiteMargemNeg: r.permite_margem_negativa ?? null,
        portMaxContratosUnica: r.max_contratos_unica_digitacao ?? null,
        taxaMinimaAm: r.taxa_minima_am ?? null,
        taxaMaximaAm: r.taxa_maxima_am ?? null,
        maxContratosPorBeneficio: r.max_contratos_por_beneficio ?? null,
        dataCorte: r.data_corte ?? null,
        limiteCartaoMinimo: r.limite_cartao_minimo ?? null,
        limiteCartaoMaximo: r.limite_cartao_maximo ?? null,
        fatorRmc: r.fator_rmc ?? null,
        parcelaMinima: r.parcela_minima ?? null,
        saldoDevedorMaximo: r.saldo_devedor_maximo ?? null,
        trocoMinimoLiberado: r.troco_minimo_liberado ?? null,
        versaoRoteiro: r.versao_roteiro ?? null,
        dataAtualizacaoRoteiro: r.data_atualizacao_roteiro ?? null,
        validadeRoteiro: r.validade_roteiro ?? null,
        bancosPagamento: r.bancos_pagamento ?? [],
        documentosObrigatorios: r.documentos_obrigatorios ?? [],
        publicoExcluido: r.publico_excluido ?? [],
        restricoesPorEspecie: (r.restricoes_por_especie ?? []) as object[],
        observacoes: r.observacoes ?? null,
        fonteTipo: importacaoPdfId ? "ia_pdf" : "manual",
        fonteExtraidoEm: new Date(),
        importacaoPdfId: importacaoPdfId ?? null,
      };

      const salva = await prisma.regraProdutoCredito.upsert({
        where: {
          empresaId_bancoId_produtoId_tipoOperacao: {
            empresaId,
            bancoId,
            produtoId,
            tipoOperacao: tipo,
          },
        },
        update: dados,
        create: dados,
        select: { id: true, produtoNome: true },
      });
      salvas.push({ id: salva.id, tipo, produto: salva.produtoNome });
    } catch (e) {
      erros.push({ regra: i, erro: (e as Error).message });
    }
  }

  if (importacaoPdfId) {
    await prisma.importacaoPDF.update({
      where: { id: importacaoPdfId },
      data: { etapa: `Salvas ${salvas.length}/${regras.length} regras` },
    });
  }

  return {
    ok: erros.length === 0,
    banco_id: bancoId,
    banco_nome: bancoNome,
    salvas,
    erros,
  };
}
