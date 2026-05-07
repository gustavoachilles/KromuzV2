// Sugestões de match (banco × produto × convênio) — porta a heurística do Base44.
// Roda no banco local após a extração para evitar latência adicional do LLM.

import { prisma } from "@/lib/prisma";
import { norm, normalizarTipoOperacao } from "./extrair";
import type { RegraExtraida } from "./schema";

export type SugestaoBanco = { id: string; nome: string };

export async function casarBanco(
  empresaId: string,
  bancoNomeIa: string | undefined,
  bancoHint?: string
): Promise<SugestaoBanco | null> {
  const bancoNome = bancoNomeIa || bancoHint || "";
  if (!bancoNome) return null;

  const bancos = await prisma.banco.findMany({
    where: { empresaId, ativo: true },
    select: { id: true, nome: true },
  });

  const nomeNorm = norm(bancoNome);
  if (!nomeNorm) return null;

  // 1) Match exato
  let match =
    bancos.find((b) => norm(b.nome) === nomeNorm) ||
    bancos.find(
      (b) => norm(b.nome).includes(nomeNorm) || nomeNorm.includes(norm(b.nome))
    );

  // 2) Match por palavras > 3 chars
  if (!match) {
    const palavras = nomeNorm.split(/\s+/).filter((p) => p.length > 3);
    match = bancos.find((b) => palavras.some((p) => norm(b.nome).includes(p))) || undefined;
  }

  if (match) return { id: match.id, nome: match.nome };

  // 3) Cadastro automático (mesma estratégia do legado)
  const novo = await prisma.banco.create({
    data: { empresaId, nome: bancoNome, ativo: true },
    select: { id: true, nome: true },
  });
  return novo;
}

export type RegraComSugestao = RegraExtraida & {
  tipo_operacao_normalizado: ReturnType<typeof normalizarTipoOperacao>;
  sugestao_produto_id: string | null;
  sugestao_produto_nome: string | null;
  sugestao_produto_aviso: string | null;
  sugestao_convenio_id: string | null;
  sugestao_convenio_nome: string | null;
};

export async function enriquecerRegras(
  empresaId: string,
  bancoId: string | null,
  regras: RegraExtraida[]
): Promise<RegraComSugestao[]> {
  const [produtos, convenios] = await Promise.all([
    bancoId
      ? prisma.produtoCredito.findMany({
          where: { empresaId, bancoId },
          select: { id: true, nomeProduto: true, tipoProduto: true },
        })
      : Promise.resolve([]),
    prisma.convenio.findMany({
      where: { empresaId, ativo: true },
      select: { id: true, nome: true },
    }),
  ]);

  return regras.map((r) => {
    const tipoOp = normalizarTipoOperacao(r.tipo_operacao);
    const produto = tipoOp
      ? produtos.find((p) => p.tipoProduto === tipoOp)
      : undefined;
    const convenio = convenios.find(
      (c) => norm(c.nome) === norm(r.convenio_nome)
    );
    return {
      ...r,
      tipo_operacao_normalizado: tipoOp,
      sugestao_produto_id: produto?.id ?? null,
      sugestao_produto_nome: produto?.nomeProduto ?? null,
      sugestao_produto_aviso:
        !produto && tipoOp
          ? `Cadastre o produto "${tipoOp}" para este banco antes de salvar.`
          : null,
      sugestao_convenio_id: convenio?.id ?? null,
      sugestao_convenio_nome: convenio?.nome ?? null,
    };
  });
}
