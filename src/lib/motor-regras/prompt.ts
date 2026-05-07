// Prompt do Motor de Regras — versão concisa.
// Mantém todos os pontos críticos (zeros como null, parcelas mín pagas
// condicionais, troco mínimo, RMC, versão do roteiro, etc) mas estrutura
// de forma mais clara. O normalizador TS faz a defesa em profundidade.

export function buildPromptExtracao(bancoHint?: string): string {
  return `Você é especialista em crédito consignado brasileiro. Analise este documento (roteiro operacional ${
    bancoHint ? `do banco ${bancoHint}` : "de banco"
  }) e extraia as regras estruturadas em JSON.

# REGRA #1 — Uma regra por TIPO DE OPERAÇÃO

Cada PDF descreve várias operações distintas. Gere UMA regra separada para cada uma:
- Margem Nova / Empréstimo Novo / Margem Livre  → tipo_operacao = "EMPRESTIMO_CONSIGNADO"
- Refinanciamento                                → "REFINANCIAMENTO"
- Portabilidade simples                          → "PORTABILIDADE"
- Portabilidade + Refin (Refin de Port)          → "PORTABILIDADE_REFIN"
- Cartão Consignado / RMC                        → "CARTAO_CONSIGNADO"
- Cartão Benefício / RCC                         → "CARTAO_BENEFICIO"

Se uma operação não aparece no PDF, NÃO crie regra para ela. NÃO INVENTE.

# REGRA #2 — Campos não identificados = null

Se o documento não menciona um campo, retorne **null** (não 0, não -1, não "N/A", não invente).
Use 0 apenas quando o documento explicitar zero como valor real.

Exceções por contexto:
- "Sem limite", "Ilimitado", "Conforme tabela" → null
- "Não possui", "Não se aplica", "Sem mínimo" → 0 (zero é o valor)

# REGRA #3 — Espécies INSS

\`especies_aceitas\` e \`especies_bloqueadas\` recebem APENAS números como string (ex: "32", "41", "88"). Nunca descrições.

# REGRA #4 — Parcelas mínimas pagas (REFIN/PORT)

Se o documento diz "10 parcelas pagas OU 5 parcelas com financiamento ≥ R$ 5.000", use SEMPRE o MENOR (=5).
Outros padrões: "carência de X parcelas", "X parcelas quitadas", "pelo menos X prestações pagas".
Se nada disso, use null. Aplica-se só a REFIN, PORT, PORT_REFIN.

# REGRA #5 — Margem consignável

- \`margem_padrao_pct\`: percentual padrão (ex: 35)
- \`margem_loas_pct\`: percentual específico para LOAS (espécie 88) **somente quando diferente do padrão**.
  Se for igual ao padrão ou não mencionado, retorne null.

# REGRA #6 — Cartão (CARTAO_CONSIGNADO / CARTAO_BENEFICIO)

- \`limite_cartao_minimo\`, \`limite_cartao_maximo\`: em R$
- \`fator_rmc\`: ex "RMC × 32" → 32
- \`parcela_minima\`: parcela mensal em R$ (ex: 15)
- Para cartões, valor_min/valor_max devem ser null.

# REGRA #7 — Troco no Refin/Port

\`troco_minimo_liberado\`: valor mínimo (R$) que deve sair como crédito ao cliente.
Padrões: "troco mínimo R$ X", "valor liberado ao cliente: R$ X", "saque mínimo R$ X".
Se não houver, retorne null.

# REGRA #8 — Saldo devedor (PORT, PORT_REFIN)

\`saldo_devedor_maximo\`: se o roteiro limita "operações até R$ X", extrair X. Senão null.

# REGRA #9 — Versão e data do roteiro

\`versao_roteiro\`: padrões "Versão 70.0", "V17", "RO nº 01.01 V53". Extrair só o identificador.
\`data_atualizacao_roteiro\`: formato DD/MM/YYYY. Padrões: "Atualização: 18/02/2026", "Última atualização: 09/09/2025".

# REGRA #10 — Bancos aceitos para crédito (\`bancos_pagamento\`)

Quando o PDF tem "Bancos Aceitos para Pagamento":
\`\`\`json
[ { "codigo": "001", "nome": "Banco do Brasil S.A." } ]
\`\`\`
Codigo COMPE com zeros à esquerda. Se não houver lista, [].

# REGRA #11 — Documentos obrigatórios e público excluído

\`documentos_obrigatorios\`: array de strings (ex: "CCB (3 primeiras páginas)", "RG válido por 10 anos").
\`publico_excluido\`: lista textual de quem NÃO pode contratar (ex: "Beneficiários LOAS", "Representado por terceiros").

# REGRA #12 — Restrições por espécie

Quando uma espécie tem regra especial:
\`\`\`json
[
  { "especies": [4, 5, 6, 32, 92], "descricao": "Aposentadoria por Invalidez", "idade_minima": 60, "excecao": "Aceita 55-59 se benefício há 15+ anos" }
]
\`\`\`

# Campos NÃO aplicáveis por tipo (deixe null)

| Tipo de operação        | Campos a deixar null                                                  |
|-------------------------|------------------------------------------------------------------------|
| EMPRESTIMO_CONSIGNADO   | saldo_devedor_maximo, troco_minimo_liberado, limite_cartao_*, fator_rmc |
| REFINANCIAMENTO         | limite_cartao_*, fator_rmc                                            |
| PORTABILIDADE           | valor_min, valor_max, limite_cartao_*, fator_rmc                       |
| PORTABILIDADE_REFIN     | limite_cartao_*, fator_rmc                                            |
| CARTAO_CONSIGNADO/BENEFICIO | prazo_max nas faixas, taxa_*, valor_min, valor_max               |

Saída: JSON com formato { "banco_nome": "...", "versao_roteiro": "...", "regras": [ ... ] }`;
}
