import { Banco, RegraProdutoCredito, TabelaCoeficiente, TipoOperacao } from "@prisma/client";

export interface ClienteSimulacao {
  nome?: string;
  idade: number;
  uf: string;
  especie: number;
  especieNome?: string;
  numeroBeneficio?: string;
  possuiRepresentanteLegal: boolean;
  dataDespachoBeneficio: Date;
  margemLivre: number;
  margemRmc: number;
  margemRcc: number;
}

export interface ContratoAtivo {
  id: string;
  bancoNome: string;
  bancoId?: string;
  valorParcela: number;
  parcelasPagas: number;
  parcelasTotal: number;
  taxaJuros: number;
  saldoDevedorEstimado: number;
  prazoRestante: number;
  especieOriginal?: string;
}

export interface Oportunidade {
  tipo: TipoOperacao;
  bancoId: string;
  bancoNome: string;
  produtoId: string;
  produtoNome: string;
  convenioId?: string | null;
  
  valorParcela: number;
  valorLiberado: number;
  prazo: number;
  taxaJuros: number;
  
  // Específico para Portabilidade/Refin
  contratoOriginalId?: string;
  trocoEstimado?: number;
  reducaoParcela?: number;
  
  // Status de Match
  score: number; // 0 a 100
  mensagens: string[];
}

/**
 * Função utilitária para checar se dois bancos são da mesma instituição
 * (Trata variações como "Banco Daycoval" e "Daycoval")
 */
function isMesmoBanco(nome1: string | undefined | null, nome2: string | undefined | null): boolean {
  if (!nome1 || !nome2) return false;
  const n1 = nome1.toUpperCase().trim();
  const n2 = nome2.toUpperCase().trim();
  return n1.includes(n2) || n2.includes(n1);
}

/**
 * Calcula o Valor Presente (Saldo Devedor) de um contrato
 * com base na parcela, prazo restante e taxa de juros original.
 */
function calcularPresentValue(pmt: number, n: number, i: number): number {
  if (n <= 0 || pmt <= 0) return 0;
  if (i <= 0) return pmt * n; // Sem juros
  const iDecimal = i / 100;
  return pmt * ((1 - Math.pow(1 + iDecimal, -n)) / iDecimal);
}

/**
 * Cérebro do Motor de Regras:
 * Cruza os dados do cliente (HISCON) com as regras dos bancos para gerar oportunidades.
 */
export function calcularOportunidades(
  cliente: ClienteSimulacao,
  contratosInput: ContratoAtivo[],
  regras: RegraProdutoCredito[],
  tabelas: TabelaCoeficiente[],
  bancos: Banco[] // Injetamos a lista de bancos para puxar o fatorSaldo
): { oportunidades: Oportunidade[]; contratosAtualizados: ContratoAtivo[] } {
  const oportunidades: Oportunidade[] = [];

  // Pré-processamento: Garante que o Saldo Devedor não seja R$ 0.00
  // Se for 0.00 (não veio no PDF), estimamos via Valor Presente da dívida.
  const contratos = contratosInput.map(c => {
    let saldo = c.saldoDevedorEstimado;
    if (!saldo || saldo <= 0) {
      saldo = calcularPresentValue(c.valorParcela, c.prazoRestante, c.taxaJuros || 1.66);
    }
    return { ...c, saldoDevedorEstimado: saldo };
  });

  for (const regra of regras) {
    if (!regra.ativa) continue;

    const mensagens: string[] = [];
    let elegivel = true;

    // 1. Filtros Básicos (Políticas de Crédito)
    
    // Idade (via faixas_etarias ou idade_min/max se adicionarmos)
    // Para simplificar no MVP, vamos checar faixas_etarias JSON
    const faixaEtariaValida = (regra.faixasEtarias as any[])?.find(f => 
      (f.idade_min === null || cliente.idade >= f.idade_min) &&
      (f.idade_max === null || cliente.idade <= f.idade_max)
    );
    if (!faixaEtariaValida && (regra.faixasEtarias as any[]).length > 0) {
      // Se tem faixas definidas e o cliente não cai em nenhuma
      continue; 
    }

    // Espécies Aceitas
    const especiesAceitas = (regra.especies as any)?.aceitas as number[] ?? [];
    const especiesBloqueadas = (regra.especies as any)?.bloqueadas as number[] ?? [];
    if (cliente.especie !== 0) {
      if (especiesAceitas.length > 0 && !especiesAceitas.includes(cliente.especie)) {
        continue;
      }
      if (especiesBloqueadas.includes(cliente.especie)) {
        continue;
      }
    }

    // Representante Legal
    if (cliente.possuiRepresentanteLegal && regra.representanteLegalPermitido === false) {
      continue;
    }

    // UF Bloqueada
    if ((regra.ufBloqueadas as string[])?.includes(cliente.uf)) {
      continue;
    }

    // DDB (IN100 - Bloqueio de 90 dias)
    const diffDias = (new Date().getTime() - cliente.dataDespachoBeneficio.getTime()) / (1000 * 3600 * 24);
    if (regra.ddbMinimoDias && diffDias < regra.ddbMinimoDias) {
      continue;
    }

    // 2. Simulação por Tipo de Operação
    
    // --- MARGEM LIVRE (NOVO) ---
    if (regra.tipoOperacao === "EMPRESTIMO_CONSIGNADO" && cliente.margemLivre > 0) {
      // Busca tabelas compatíveis
      const tabelasProduto = tabelas.filter(t => 
        t.bancoId === regra.bancoId && 
        t.produtoId === regra.produtoId
      );

      for (const tab of tabelasProduto) {
        if (!tab.ativo) continue;

        const valorLiberado = cliente.margemLivre / tab.coeficiente;
        if (valorLiberado < (regra.margemNovaValorMin ?? 500)) continue;

        oportunidades.push({
          tipo: "EMPRESTIMO_CONSIGNADO",
          bancoId: regra.bancoId,
          bancoNome: regra.bancoNome,
          produtoId: regra.produtoId,
          produtoNome: regra.produtoNome,
          convenioId: regra.convenioId,
          valorParcela: cliente.margemLivre,
          valorLiberado: valorLiberado,
          prazo: tab.prazo,
          taxaJuros: tab.taxaJurosMensal,
          score: 100,
          mensagens: ["Margem livre disponível"]
        });
      }
    }

    // --- PORTABILIDADE ---
    if (regra.tipoOperacao === "PORTABILIDADE") {
      // Regras de bloqueio de compra extraídas do Roteiro Operacional (Bevihelp)
      const RESTRICOES_ORIGEM: Record<string, string[]> = {
        "C6": ["AGIPLAN", "CETELEM", "FACTA", "DAYCOVAL", "PAN", "MERCANTIL", "BANCO OBM", "BANCO BMG"],
        "DAYCOVAL": ["C6", "SAFRA", "PAN", "BMG", "MERCANTIL", "AGIPLAN"],
        "BANRISUL": [],
        "BRB": [],
        "FACTA": ["CETELEM", "AGIPLAN"],
        "ICRED": [],
        "TOTAL CASH": ["PINE", "INBURSA", "QI TECH", "QI SOCIEDADE", "BRB"],
        "PAN": [],
        "QUERO MAIS": [],
        "NBC": [],
        "PRESENÇA": [],
        "CRED CAPITAL": []
      };

      for (const contrato of contratos) {
        // Regra de Ouro: Portabilidade só faz sentido para bancos diferentes
        if (isMesmoBanco(contrato.bancoNome, regra.bancoNome)) {
          console.log(`  ❌ SKIP ${regra.bancoNome} ← ${contrato.bancoNome}: mesmo banco`);
          continue;
        }

        // Regra de Ouro 2: Bloqueio de Origem (Ex: C6 não compra de Facta)
        const blacklist = Object.keys(RESTRICOES_ORIGEM).find(k => isMesmoBanco(k, regra.bancoNome));
        if (blacklist) {
          const isBloqueado = RESTRICOES_ORIGEM[blacklist].some(bloqueado => 
            contrato.bancoNome.toUpperCase().includes(bloqueado)
          );
          if (isBloqueado) {
            console.log(`  ❌ SKIP ${regra.bancoNome} ← ${contrato.bancoNome}: blacklist [${RESTRICOES_ORIGEM[blacklist].join(',')}]`);
            continue;
          }
        }

        if (regra.portParcelasMinPagas && contrato.parcelasPagas < regra.portParcelasMinPagas) {
          console.log(`  ❌ SKIP ${regra.bancoNome} ← ${contrato.bancoNome}: parcelas ${contrato.parcelasPagas} < min ${regra.portParcelasMinPagas}`);
          continue;
        }
        if (regra.taxaMinimaAm && contrato.taxaJuros < regra.taxaMinimaAm) {
          console.log(`  ❌ SKIP ${regra.bancoNome} ← ${contrato.bancoNome}: taxa ${contrato.taxaJuros} < min ${regra.taxaMinimaAm}`);
          continue;
        }
        
        const tabPort = tabelas.find(t => 
          t.bancoId === regra.bancoId && 
          t.produtoId === regra.produtoId &&
          t.prazo >= contrato.prazoRestante
        );

        if (!tabPort) {
          console.log(`  ❌ SKIP ${regra.bancoNome} ← ${contrato.bancoNome}: sem tabela (prazoRestante=${contrato.prazoRestante}, bancoId=${regra.bancoId}, produtoId=${regra.produtoId})`);
          console.log(`     Tabelas disponíveis para este banco/produto:`, tabelas.filter(t => t.bancoId === regra.bancoId).map(t => `${t.produtoId}/${t.prazo}x`));
        }

          if (tabPort) {
            // Promosys lógica: Saldo Devedor = PV total das parcelas restantes (sem fator de redução)
            // O fatorSaldo só é usado quando estimamos saldo a partir do valor ORIGINAL do contrato
            // Quando já temos o PV calculado, usamos ele direto
            const saldoParaQuitacao = contrato.saldoDevedorEstimado;
            const novoValorLiberado = contrato.valorParcela / tabPort.coeficiente;
            
            const trocoLiquido = novoValorLiberado - saldoParaQuitacao;
            
            // Taxa Ponderada (Promosys): média ponderada entre dívida velha e dinheiro novo
            const taxaPonderada = trocoLiquido > 0 
              ? ((saldoParaQuitacao * contrato.taxaJuros) + (trocoLiquido * tabPort.taxaJurosMensal)) / novoValorLiberado
              : tabPort.taxaJurosMensal;

            console.log(`  🔍 PORT ${regra.bancoNome} ← ${contrato.bancoNome}: coef=${tabPort.coeficiente.toFixed(6)}, saldo=${saldoParaQuitacao.toFixed(2)}, liberado=${novoValorLiberado.toFixed(2)}, troco=${trocoLiquido.toFixed(2)}`);

            if (trocoLiquido >= (regra.trocoMinimoLiberado ?? 0)) {
              const taxaReduzida = contrato.taxaJuros > tabPort.taxaJurosMensal;
              const score = taxaReduzida ? 100 : 80;

              oportunidades.push({
                tipo: "PORTABILIDADE",
                bancoId: regra.bancoId,
                bancoNome: regra.bancoNome,
                produtoId: regra.produtoId,
                produtoNome: regra.produtoNome,
                convenioId: regra.convenioId,
                valorParcela: contrato.valorParcela,
                valorLiberado: novoValorLiberado,
                prazo: tabPort.prazo,
                taxaJuros: taxaPonderada,
                contratoOriginalId: contrato.id,
                trocoEstimado: trocoLiquido,
                score: score,
                mensagens: [
                  `Portabilidade com troco de R$ ${trocoLiquido.toFixed(2)}`,
                  `Taxa Ponderada: ${taxaPonderada.toFixed(2)}% a.m.`
                ]
              });
            } else {
              console.log(`  ❌ SKIP ${regra.bancoNome} ← ${contrato.bancoNome}: troco ${trocoLiquido.toFixed(2)} < min ${regra.trocoMinimoLiberado}`);
            }
          }
      }
    }

    // --- REFINANCIAMENTO ---
    if (regra.tipoOperacao === "REFINANCIAMENTO") {
      for (const contrato of contratos) {
        // Regra de Ouro: Refinanciamento DEVE ser no MESMO banco da dívida original
        if (!isMesmoBanco(contrato.bancoNome, regra.bancoNome)) continue;

        if (regra.refinPermitido === false) continue;
        if (regra.refinParcelasMinPagas && contrato.parcelasPagas < regra.refinParcelasMinPagas) continue;

        const tabelasRefin = tabelas.filter(t =>
          t.bancoId === regra.bancoId &&
          t.produtoId === regra.produtoId
        );

        for (const tab of tabelasRefin) {
          if (!tab.ativo) continue;

          // Busca fator_saldo do banco de origem
          const bancoOrigem = bancos.find(b => 
            contrato.bancoNome.toUpperCase().includes(b.nome.toUpperCase()) ||
            b.nome.toUpperCase().includes(contrato.bancoNome.toUpperCase())
          );
          const fatorSaldo = bancoOrigem?.fatorSaldo ?? 1.0;

          // Refin: quita saldo devedor com desconto + libera troco com novo prazo
          const saldoParaQuitacao = contrato.saldoDevedorEstimado * fatorSaldo;
          const novoLiberado = contrato.valorParcela / tab.coeficiente;
          
          const trocoBruto = novoLiberado - saldoParaQuitacao;
          const iof = trocoBruto > 0 ? trocoBruto * 0.013 : 0;
          const trocoLiquido = trocoBruto - iof;

          if (trocoLiquido < (regra.refinTrocoMin ?? 0)) continue;
          if (novoLiberado < (regra.refinValorMin ?? 0)) continue;

          // Agrega margem livre se regra permitir
          const margemAgregada = regra.refinAgregaMargem ? cliente.margemLivre : 0;
          const valorTotal = novoLiberado + (margemAgregada > 0 ? margemAgregada / tab.coeficiente : 0);

          oportunidades.push({
            tipo: "REFINANCIAMENTO",
            bancoId: regra.bancoId,
            bancoNome: regra.bancoNome,
            produtoId: regra.produtoId,
            produtoNome: regra.produtoNome,
            convenioId: regra.convenioId,
            valorParcela: contrato.valorParcela + (regra.refinAgregaMargem ? margemAgregada : 0),
            valorLiberado: valorTotal,
            prazo: tab.prazo,
            taxaJuros: tab.taxaJurosMensal,
            contratoOriginalId: contrato.id,
            trocoEstimado: trocoLiquido,
            score: 85,
            mensagens: [
              `Refinanciamento com troco de R$ ${trocoLiquido.toFixed(2)}`,
              ...(regra.refinAgregaMargem && margemAgregada > 0
                ? [`Margem livre agregada: R$ ${margemAgregada.toFixed(2)}`]
                : []),
            ],
          });
        }
      }
    }

    // --- PORTABILIDADE + REFIN ---
    if (regra.tipoOperacao === "PORTABILIDADE_REFIN") {
      const RESTRICOES_ORIGEM: Record<string, string[]> = {
        "C6": ["AGIPLAN", "CETELEM", "FACTA", "DAYCOVAL", "PAN", "MERCANTIL", "BANCO OBM", "BANCO BMG"],
        "DAYCOVAL": ["C6", "SAFRA", "PAN", "BMG", "MERCANTIL", "AGIPLAN"],
        "BANRISUL": [],
        "BRB": [],
        "FACTA": ["CETELEM", "AGIPLAN"],
        "ICRED": [],
        "TOTAL CASH": ["PINE", "INBURSA", "QI TECH", "QI SOCIEDADE", "BRB"],
        "PAN": [],
        "QUERO MAIS": [],
        "NBC": [],
        "PRESENÇA": [],
        "CRED CAPITAL": []
      };

      for (const contrato of contratos) {
        // Regra de Ouro: Portabilidade requer troca de banco
        if (isMesmoBanco(contrato.bancoNome, regra.bancoNome)) continue;

        // Regra de Ouro 2: Bloqueio de Origem (Ex: C6 não compra de Facta)
        const blacklist = Object.keys(RESTRICOES_ORIGEM).find(k => isMesmoBanco(k, regra.bancoNome));
        if (blacklist) {
          const isBloqueado = RESTRICOES_ORIGEM[blacklist].some(bloqueado => 
            contrato.bancoNome.toUpperCase().includes(bloqueado)
          );
          if (isBloqueado) continue;
        }

        if (regra.portParcelasMinPagas && contrato.parcelasPagas < regra.portParcelasMinPagas) continue;
        if (regra.taxaMinimaAm && contrato.taxaJuros < regra.taxaMinimaAm) continue;

        const tab = tabelas.find(t =>
          t.bancoId === regra.bancoId &&
          t.produtoId === regra.produtoId &&
          t.prazo >= contrato.prazoRestante
        );

        if (tab) {
          // Promosys lógica: Saldo Devedor = PV das parcelas restantes (sem fator)
          const saldoParaQuitacao = contrato.saldoDevedorEstimado;
          const novoLiberado = contrato.valorParcela / tab.coeficiente;
          
          const trocoLiquido = novoLiberado - saldoParaQuitacao;
          
          // Taxa Ponderada (Promosys)
          const taxaPonderada = trocoLiquido > 0 
            ? ((saldoParaQuitacao * contrato.taxaJuros) + (trocoLiquido * tab.taxaJurosMensal)) / novoLiberado
            : tab.taxaJurosMensal;

          if (trocoLiquido >= (regra.trocoMinimoLiberado ?? 0)) {
            // Pontua mais alto se a taxa de origem for maior que a destino
            const taxaReduzida = contrato.taxaJuros > tab.taxaJurosMensal;
            const score = taxaReduzida ? 100 : 85;

            oportunidades.push({
              tipo: "PORTABILIDADE_REFIN",
              bancoId: regra.bancoId,
              bancoNome: regra.bancoNome,
              produtoId: regra.produtoId,
              produtoNome: regra.produtoNome,
              convenioId: regra.convenioId,
              valorParcela: contrato.valorParcela,
              valorLiberado: novoLiberado,
              prazo: tab.prazo,
              taxaJuros: taxaPonderada,
              contratoOriginalId: contrato.id,
              trocoEstimado: trocoLiquido,
              reducaoParcela: contrato.valorParcela - (novoLiberado * tab.coeficiente),
              score: score,
              mensagens: [
                `Port+Refin com troco de R$ ${trocoLiquido.toFixed(2)}`,
                `Taxa Ponderada: ${taxaPonderada.toFixed(2)}% a.m.`
              ],
            });
          }
        }
      }
    }

    // --- CARTÃO CONSIGNADO (RMC) ---
    if (regra.tipoOperacao === "CARTAO_CONSIGNADO" && cliente.margemRmc > 0) {
      const limiteSaque = cliente.margemRmc * (regra.margemPadraoPct ?? 0.9);
      if (limiteSaque > 0) {
        oportunidades.push({
          tipo: "CARTAO_CONSIGNADO",
          bancoId: regra.bancoId,
          bancoNome: regra.bancoNome,
          produtoId: regra.produtoId,
          produtoNome: regra.produtoNome,
          convenioId: regra.convenioId,
          valorParcela: cliente.margemRmc,
          valorLiberado: limiteSaque,
          prazo: 0,
          taxaJuros: regra.taxaMaximaAm ?? 3.0,
          score: 70,
          mensagens: [`Limite saque RMC: R$ ${limiteSaque.toFixed(2)}`],
        });
      }
    }

    // --- CARTÃO BENEFÍCIO (RCC) ---
    if (regra.tipoOperacao === "CARTAO_BENEFICIO" && cliente.margemRcc > 0) {
      const limiteSaque = cliente.margemRcc * (regra.margemPadraoPct ?? 0.7);
      if (limiteSaque > 0) {
        oportunidades.push({
          tipo: "CARTAO_BENEFICIO",
          bancoId: regra.bancoId,
          bancoNome: regra.bancoNome,
          produtoId: regra.produtoId,
          produtoNome: regra.produtoNome,
          convenioId: regra.convenioId,
          valorParcela: cliente.margemRcc,
          valorLiberado: limiteSaque,
          prazo: 0,
          taxaJuros: regra.taxaMaximaAm ?? 3.5,
          score: 65,
          mensagens: [`Limite saque RCC: R$ ${limiteSaque.toFixed(2)}`],
        });
      }
    }
  }

  // Debug: mostra TODAS as oportunidades geradas antes do dedup
  console.log(`📊 [MOTOR] Total oportunidades ANTES dedup: ${oportunidades.length}`);
  const tipoCount: Record<string, number> = {};
  for (const op of oportunidades) {
    tipoCount[op.tipo] = (tipoCount[op.tipo] || 0) + 1;
  }
  console.log(`📊 [MOTOR] Por tipo:`, JSON.stringify(tipoCount));
  console.log(`📊 [MOTOR] Bancos únicos:`, [...new Set(oportunidades.map(o => o.bancoNome))].join(', '));

  // Ordenar por score desc, depois valor liberado desc
  oportunidades.sort((a, b) => b.score - a.score || (b.valorLiberado || 0) - (a.valorLiberado || 0));

  // Deduplicação: preserva diferentes prazos do mesmo banco (84x, 96x, 108x)
  // Apenas dedup se MESMO banco + tipo + contrato + prazo
  const seen = new Map<string, Oportunidade>();
  for (const op of oportunidades) {
    const key = `${op.bancoId}-${op.tipo}-${op.contratoOriginalId || "novo"}-${op.prazo}`;
    const existing = seen.get(key);
    if (!existing || op.valorLiberado > existing.valorLiberado) {
      seen.set(key, op);
    }
  }
  const oportunidadesDedup = Array.from(seen.values());

  // Re-ordena após deduplicação
  oportunidadesDedup.sort((a, b) => b.score - a.score || (b.valorLiberado || 0) - (a.valorLiberado || 0));

  // Limita a 10 melhores por tipo para não poluir a tela
  const porTipo = new Map<string, Oportunidade[]>();
  for (const op of oportunidadesDedup) {
    const list = porTipo.get(op.tipo) || [];
    list.push(op);
    porTipo.set(op.tipo, list);
  }
  const oportunidadesFinais: Oportunidade[] = [];
  for (const [, list] of porTipo) {
    oportunidadesFinais.push(...list.slice(0, 50)); // Sem limite artificial
  }

  return { oportunidades: oportunidadesFinais, contratosAtualizados: contratos };
}
