export type LeadData = {
  idade?: number;
  especieBeneficio?: number;
  margemLivre?: number;
  uf?: string;
};

export function calculateLeadScore(lead: LeadData): number {
  let score = 0;

  // 1. Margem Livre (Peso Alto)
  if (lead.margemLivre) {
    if (lead.margemLivre > 500) score += 40;
    else if (lead.margemLivre > 200) score += 25;
    else if (lead.margemLivre > 50) score += 10;
  }

  // 2. Espécie do Benefício (Qualidade do Lead)
  // Espécies 32 (Invalidez), 21 (Pensão), 42 (Aposentadoria) costumam ser melhores
  const especiesNobres = [32, 21, 42, 92];
  if (lead.especieBeneficio && especiesNobres.includes(lead.especieBeneficio)) {
    score += 30;
  } else if (lead.especieBeneficio === 87 || lead.especieBeneficio === 88) {
    // LOAS/BPC (Mais difícil de aprovar em alguns bancos)
    score += 15;
  }

  // 3. Idade (Idade muito alta tem mais recusa por seguro/prazo)
  if (lead.idade) {
    if (lead.idade >= 45 && lead.idade <= 70) score += 30;
    else if (lead.idade < 45) score += 15;
    else if (lead.idade > 70 && lead.idade <= 78) score += 10;
    else if (lead.idade > 78) score -= 10; // Penalidade por idade avançada
  }

  // 4. UF (Opcional - Bancos gostam de SP/MG/RJ)
  const ufsPremium = ["SP", "MG", "RJ", "RS", "PR"];
  if (lead.uf && ufsPremium.includes(lead.uf.toUpperCase())) {
    score += 5;
  }

  // Garantir range 0-100
  return Math.min(Math.max(score, 0), 100);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"; // Quente
  if (score >= 50) return "text-amber-600 dark:text-amber-400";     // Morno
  return "text-blue-600 dark:text-blue-400";                       // Frio
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Oportunidade de Ouro";
  if (score >= 50) return "Bom Potencial";
  return "Lead Padrão";
}
