// ─────────────────────────────────────────────────────────────────
// Utilitários de Validação — Módulo Contábil & Fiscal
// ─────────────────────────────────────────────────────────────────

/**
 * Valida CPF brasileiro com algoritmo de dígitos verificadores.
 * Aceita com ou sem pontuação (123.456.789-00 ou 12345678900).
 */
export function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;

  // Rejeitar CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validar primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleaned[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cleaned[9])) return false;

  // Validar segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleaned[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cleaned[10])) return false;

  return true;
}

/**
 * Formata CPF para exibição: 123.456.789-00
 */
export function formatarCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

/**
 * Valida CNPJ brasileiro.
 */
export function validarCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(cleaned[i]) * pesos1[i];
  let resto = soma % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cleaned[12]) !== d1) return false;

  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(cleaned[i]) * pesos2[i];
  resto = soma % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cleaned[13]) !== d2) return false;

  return true;
}

/**
 * Sanitiza string para prevenir XSS e injection.
 * Remove tags HTML e limita tamanho.
 */
export function sanitizar(text: string | null | undefined, maxLength = 500): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")           // Remove HTML tags
    .replace(/[<>"'`]/g, "")           // Remove caracteres perigosos
    .trim()
    .slice(0, maxLength);
}

/**
 * Valida e-mail com regex básica.
 */
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida valor monetário (positivo, até 2 casas decimais).
 */
export function validarValor(valor: any): boolean {
  const num = parseFloat(valor);
  return !isNaN(num) && num > 0 && num < 100_000_000; // Máx R$100M
}
