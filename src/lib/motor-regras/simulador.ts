import { TipoOperacao } from "@prisma/client";

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
 * Cérebro do Motor de Regras:
 * Cruza os dados do cliente (HISCON) com as regras dos bancos para gerar oportunidades.
 */
export function calcularOportunidades(
  cliente: ClienteSimulacao,
  contratos: ContratoAtivo[],
  regras: any[], // RegraProdutoCredito[] do Prisma
  tabelas: any[] // TabelaCoeficiente[] do Prisma
): Oportunidade[] {
  const oportunidades: Oportunidade[] = [];

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
    const especiesAceitas = regra.especies?.aceitas as number[] ?? [];
    const especiesBloqueadas = regra.especies?.bloqueadas as number[] ?? [];
    if (especiesAceitas.length > 0 && !especiesAceitas.includes(cliente.especie)) {
      continue;
    }
    if (especiesBloqueadas.includes(cliente.especie)) {
      continue;
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

        oportunidades.push({
          tipo: "EMPRESTIMO_CONSIGNADO",
          bancoId: regra.bancoId,
          bancoNome: regra.bancoNome,
          produtoId: regra.produtoId,
          produtoNome: regra.produtoNome,
          convenioId: regra.convenioId,
          valorParcela: cliente.margemLivre,
          valorLiberado: cliente.margemLivre / tab.coeficiente,
          prazo: tab.prazo,
          taxaJuros: tab.taxaJurosMensal,
          score: 100,
          mensagens: ["Margem livre disponível"]
        });
      }
    }

    // --- PORTABILIDADE ---
    if (regra.tipoOperacao === "PORTABILIDADE") {
      for (const contrato of contratos) {
        if (regra.portParcelasMinPagas && contrato.parcelasPagas < regra.portParcelasMinPagas) continue;
        if (regra.taxaMinimaAm && contrato.taxaJuros < regra.taxaMinimaAm) continue;
        
        const tabPort = tabelas.find(t => 
          t.bancoId === regra.bancoId && 
          t.produtoId === regra.produtoId &&
          t.prazo >= contrato.prazoRestante
        );

        if (tabPort) {
          const novoValorLiberado = contrato.valorParcela / tabPort.coeficiente;
          const troco = novoValorLiberado - contrato.saldoDevedorEstimado;

          if (troco >= (regra.trocoMinimoLiberado ?? 0)) {
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
              taxaJuros: tabPort.taxaJurosMensal,
              contratoOriginalId: contrato.id,
              trocoEstimado: troco,
              score: 90,
              mensagens: [`Portabilidade com troco de R$ ${troco.toFixed(2)}`]
            });
          }
        }
      }
    }

    // --- REFINANCIAMENTO ---
    if (regra.tipoOperacao === "REFINANCIAMENTO") {
      for (const contrato of contratos) {
        if (regra.refinPermitido === false) continue;
        if (regra.refinParcelasMinPagas && contrato.parcelasPagas < regra.refinParcelasMinPagas) continue;

        const tabelasRefin = tabelas.filter(t =>
          t.bancoId === regra.bancoId &&
          t.produtoId === regra.produtoId
        );

        for (const tab of tabelasRefin) {
          if (!tab.ativo) continue;

          // Refin: quita saldo devedor + libera troco com novo prazo
          const novoLiberado = contrato.valorParcela / tab.coeficiente;
          const troco = novoLiberado - contrato.saldoDevedorEstimado;

          if (troco < (regra.refinTrocoMin ?? 0)) continue;
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
            trocoEstimado: troco,
            score: 85,
            mensagens: [
              `Refinanciamento com troco de R$ ${troco.toFixed(2)}`,
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
      for (const contrato of contratos) {
        if (regra.portParcelasMinPagas && contrato.parcelasPagas < regra.portParcelasMinPagas) continue;
        if (regra.taxaMinimaAm && contrato.taxaJuros < regra.taxaMinimaAm) continue;

        const tab = tabelas.find(t =>
          t.bancoId === regra.bancoId &&
          t.produtoId === regra.produtoId &&
          t.prazo >= contrato.prazoRestante
        );

        if (tab) {
          const novoLiberado = contrato.valorParcela / tab.coeficiente;
          const troco = novoLiberado - contrato.saldoDevedorEstimado;

          if (troco >= (regra.trocoMinimoLiberado ?? 0)) {
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
              taxaJuros: tab.taxaJurosMensal,
              contratoOriginalId: contrato.id,
              trocoEstimado: troco,
              reducaoParcela: contrato.valorParcela - (novoLiberado * tab.coeficiente),
              score: 95,
              mensagens: [`Port+Refin com troco de R$ ${troco.toFixed(2)}`],
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

  // Ordenar por score desc, depois valor liberado desc
  return oportunidades.sort((a, b) => b.score - a.score || (b.valorLiberado || 0) - (a.valorLiberado || 0));
}
