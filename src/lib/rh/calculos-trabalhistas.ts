// Módulo de Cálculos Trabalhistas — CLT, INSS, FGTS, Férias, 13º
// Baseado na legislação vigente (2024/2025)

// ─── TABELA INSS PROGRESSIVA (2025) ───
const FAIXAS_INSS = [
  { limite: 1518.00, aliquota: 0.075 },
  { limite: 2793.88, aliquota: 0.09 },
  { limite: 5839.45, aliquota: 0.12 },
  { limite: 8157.41, aliquota: 0.14 },
];

// ─── TABELA IRRF (2025) ───
const FAIXAS_IRRF = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];

// ─── CÁLCULO INSS PROGRESSIVO ───
export function calcularINSS(salarioBruto: number): { valor: number; aliquotaEfetiva: number } {
  let inss = 0;
  let anterior = 0;

  for (const faixa of FAIXAS_INSS) {
    if (salarioBruto <= anterior) break;
    const base = Math.min(salarioBruto, faixa.limite) - anterior;
    if (base > 0) {
      inss += base * faixa.aliquota;
    }
    anterior = faixa.limite;
  }

  // Teto máximo
  const teto = FAIXAS_INSS.reduce((acc, f, i) => {
    const limAnterior = i === 0 ? 0 : FAIXAS_INSS[i - 1].limite;
    return acc + (f.limite - limAnterior) * f.aliquota;
  }, 0);

  inss = Math.min(inss, teto);

  return {
    valor: Math.round(inss * 100) / 100,
    aliquotaEfetiva: salarioBruto > 0 ? Math.round((inss / salarioBruto) * 10000) / 100 : 0,
  };
}

// ─── CÁLCULO IRRF ───
export function calcularIRRF(salarioBruto: number, descontoINSS: number, dependentes: number = 0): { base: number; valor: number } {
  const deducaoDependente = 189.59;
  const base = salarioBruto - descontoINSS - (dependentes * deducaoDependente);

  if (base <= 0) return { base: 0, valor: 0 };

  for (const faixa of FAIXAS_IRRF) {
    if (base <= faixa.limite) {
      const valor = Math.max(0, base * faixa.aliquota - faixa.deducao);
      return {
        base: Math.round(base * 100) / 100,
        valor: Math.round(valor * 100) / 100,
      };
    }
  }

  return { base: 0, valor: 0 };
}

// ─── CÁLCULO FGTS ───
export function calcularFGTS(salarioBruto: number): number {
  return Math.round(salarioBruto * 0.08 * 100) / 100;
}

// ─── INSS PATRONAL ───
export function calcularINSSPatronal(salarioBruto: number, regimeTributario: string): number {
  // No Simples Nacional (exceto Anexo IV), o INSS patronal está incluso no DAS
  if (regimeTributario === "SIMPLES_NACIONAL") return 0;
  // Lucro Presumido/Real: 20% patronal + RAT (~3%) + Terceiros (~5.8%)
  return Math.round(salarioBruto * 0.288 * 100) / 100;
}

// ─── VALE TRANSPORTE (DESCONTO 6%) ───
export function calcularDescontoVT(salarioBruto: number): number {
  return Math.round(salarioBruto * 0.06 * 100) / 100;
}

// ─── HORA NORMAL ───
export function calcularHoraNormal(salarioBase: number, horasSemanais: number): number {
  // Divisor: horas semanais × 5 (semanas/mês)
  const divisor = horasSemanais <= 36 ? 180 : 220;
  return Math.round((salarioBase / divisor) * 100) / 100;
}

// ─── HORAS EXTRAS ───
export function calcularHorasExtras(
  salarioBase: number,
  horasSemanais: number,
  qtdHorasExtras: number,
  tipo: "normal" | "sabado" | "domingo_feriado" = "normal"
): number {
  const horaNormal = calcularHoraNormal(salarioBase, horasSemanais);
  const multiplicador = tipo === "domingo_feriado" ? 2.0 : 1.5;
  return Math.round(qtdHorasExtras * horaNormal * multiplicador * 100) / 100;
}

// ─── DSR SOBRE HORAS EXTRAS ───
export function calcularDSRExtras(valorHorasExtras: number, diasUteisNoMes: number = 22): number {
  // DSR = (valor HE / dias úteis) × domingos e feriados
  const domingosFeriados = 8; // média mensal
  return Math.round((valorHorasExtras / diasUteisNoMes) * domingosFeriados * 100) / 100;
}

// ─── ADICIONAL NOTURNO (22h-5h = 20% adicional) ───
export function calcularAdicionalNoturno(salarioBase: number, horasSemanais: number, horasNoturnas: number): number {
  const horaNormal = calcularHoraNormal(salarioBase, horasSemanais);
  return Math.round(horasNoturnas * horaNormal * 0.20 * 100) / 100;
}

// ─── CÁLCULO DE PASSIVO TRABALHISTA ───
export interface CalculoPassivo {
  fgtsRetroativo: number;
  multaFgts40: number;
  decimoTerceiro: number;
  feriasVencidas: number;
  feriasProporcionais: number;
  tercoFerias: number;
  avisoPrevio: number;
  inssRetroativo: number;
  horasExtrasRetro: number;
  multaArt477: number;
  multaArt467: number;
  danoMoral: number;
  honorarios: number;
  passivoTotal: number;
  nivelRisco: string;
}

export function calcularPassivoTrabalhista(params: {
  salarioBase: number;
  mesesTrabalhados: number;
  regimeContratacao: string;
  tipoJornada: string;
  horasDiarias: number;
  regimeTributario: string;
}): CalculoPassivo {
  const { salarioBase, mesesTrabalhados, regimeContratacao, tipoJornada, horasDiarias, regimeTributario } = params;

  // Se for CLT regularizado, risco é baixo
  if (regimeContratacao === "CLT") {
    return {
      fgtsRetroativo: 0,
      multaFgts40: 0,
      decimoTerceiro: 0,
      feriasVencidas: 0,
      feriasProporcionais: 0,
      tercoFerias: 0,
      avisoPrevio: 0,
      inssRetroativo: 0,
      horasExtrasRetro: 0,
      multaArt477: 0,
      multaArt467: 0,
      danoMoral: 0,
      honorarios: 0,
      passivoTotal: 0,
      nivelRisco: "BAIXO",
    };
  }

  const anos = mesesTrabalhados / 12;

  // FGTS retroativo: 8% × salário × meses (limitado a 5 anos - prescrição)
  const mesesCalculo = Math.min(mesesTrabalhados, 60); // Prescrição quinquenal
  const fgtsRetroativo = Math.round(salarioBase * 0.08 * mesesCalculo * 100) / 100;
  const multaFgts40 = Math.round(fgtsRetroativo * 0.40 * 100) / 100;

  // 13º salário retroativo (1 por ano)
  const anosCompletos = Math.floor(Math.min(anos, 5));
  const mesesProporcionais = Math.min(mesesTrabalhados, 60) - (anosCompletos * 12);
  const decimoTerceiro = Math.round(
    ((salarioBase * anosCompletos) + (salarioBase * mesesProporcionais / 12)) * 100
  ) / 100;

  // Férias vencidas (períodos completos não gozados - em dobro)
  const periodosVencidos = Math.max(0, anosCompletos - 1); // Desconta o período aquisitivo atual
  const feriasVencidas = Math.round(salarioBase * periodosVencidos * 2 * 100) / 100; // em dobro

  // Férias proporcionais
  const mesesPropFerias = mesesTrabalhados % 12;
  const feriasProporcionais = Math.round(salarioBase * mesesPropFerias / 12 * 100) / 100;

  // 1/3 constitucional sobre férias
  const tercoFerias = Math.round((feriasVencidas + feriasProporcionais) / 3 * 100) / 100;

  // Aviso prévio indenizado (30 dias + 3 por ano, máx 90 dias)
  const diasAvisoPrevio = Math.min(90, 30 + Math.floor(anos) * 3);
  const avisoPrevio = Math.round(salarioBase * diasAvisoPrevio / 30 * 100) / 100;

  // INSS retroativo (só se empresa não é Simples Nacional)
  const inssRetroativo = regimeTributario !== "SIMPLES_NACIONAL"
    ? Math.round(salarioBase * 0.20 * mesesCalculo * 100) / 100
    : 0;

  // Horas extras retroativas para telemarketing em jornada errada
  let horasExtrasRetro = 0;
  if (tipoJornada === "TELEMARKETING_6H" && horasDiarias > 6) {
    // 2h extras por dia × ~22 dias úteis × meses × valor hora extra
    const horaNormal = salarioBase / 180;
    const hesPorMes = (horasDiarias - 6) * 22;
    horasExtrasRetro = Math.round(horaNormal * 1.5 * hesPorMes * mesesCalculo * 100) / 100;
  }

  // Multa Art. 477 (atraso nas verbas rescisórias)
  const multaArt477 = salarioBase;

  // Multa Art. 467 (50% verbas incontroversas)
  const verbasIncontroversas = fgtsRetroativo + decimoTerceiro + feriasProporcionais + tercoFerias;
  const multaArt467 = Math.round(verbasIncontroversas * 0.5 * 100) / 100;

  // Dano moral estimado (geralmente 2-5x o salário)
  const danoMoral = Math.round(salarioBase * 3 * 100) / 100;

  // Subtotal antes de honorários
  const subtotal = fgtsRetroativo + multaFgts40 + decimoTerceiro + feriasVencidas +
    feriasProporcionais + tercoFerias + avisoPrevio + inssRetroativo +
    horasExtrasRetro + multaArt477 + multaArt467 + danoMoral;

  // Honorários advocatícios (15% sucumbência)
  const honorarios = Math.round(subtotal * 0.15 * 100) / 100;

  const passivoTotal = Math.round((subtotal + honorarios) * 100) / 100;

  // Nível de risco
  let nivelRisco = "BAIXO";
  if (passivoTotal > salarioBase * 6) nivelRisco = "MEDIO";
  if (passivoTotal > salarioBase * 18) nivelRisco = "ALTO";
  if (passivoTotal > salarioBase * 36 || regimeContratacao === "INFORMAL") nivelRisco = "EXTREMO";

  return {
    fgtsRetroativo,
    multaFgts40,
    decimoTerceiro,
    feriasVencidas,
    feriasProporcionais,
    tercoFerias,
    avisoPrevio,
    inssRetroativo,
    horasExtrasRetro,
    multaArt477,
    multaArt467,
    danoMoral,
    honorarios,
    passivoTotal,
    nivelRisco,
  };
}

// ─── CUSTO TOTAL DO FUNCIONÁRIO PARA A EMPRESA ───
export function calcularCustoTotalEmpresa(params: {
  salarioBase: number;
  valeTransporte: boolean;
  valeAlimentacao: number;
  planoSaude: boolean;
  custoPlanoSaude?: number;
  regimeTributario: string;
}): {
  salarioBruto: number;
  fgts: number;
  inssPatronal: number;
  provisao13: number;
  provisaoFerias: number;
  valeAlimentacao: number;
  custoPlanoSaude: number;
  custoTotal: number;
} {
  const { salarioBase, valeAlimentacao, planoSaude, custoPlanoSaude = 400, regimeTributario } = params;

  const fgts = calcularFGTS(salarioBase);
  const inssPatronal = calcularINSSPatronal(salarioBase, regimeTributario);
  const provisao13 = Math.round(salarioBase / 12 * 100) / 100;
  const provisaoFerias = Math.round((salarioBase / 12) * (4 / 3) * 100) / 100; // férias + 1/3
  const custoSaude = planoSaude ? custoPlanoSaude : 0;

  const custoTotal = Math.round(
    (salarioBase + fgts + inssPatronal + provisao13 + provisaoFerias + valeAlimentacao + custoSaude)
    * 100
  ) / 100;

  return {
    salarioBruto: salarioBase,
    fgts,
    inssPatronal,
    provisao13,
    provisaoFerias,
    valeAlimentacao,
    custoPlanoSaude: custoSaude,
    custoTotal,
  };
}

// ─── MULTA POR FALTA DE REGISTRO (ART. 47 CLT) ───
export function multaFaltaRegistro(isMicroEmpresa: boolean): number {
  return isMicroEmpresa ? 800 : 3000;
}

// ─── FORMATAÇÃO ───
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(2)}%`;
}
