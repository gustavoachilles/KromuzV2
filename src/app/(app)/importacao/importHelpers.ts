// Helpers para o importador inteligente
export const FIELD_MAP: Record<string, string[]> = {
  nome: ["nome","cliente","name","nome_completo","nomecompleto","nomedocliente","nomebeneficiario"],
  cpf: ["cpf","documento","cpf_cnpj","doc","cpf/cnpj","nr_cpf","cpfcliente"],
  telefone: ["telefone","celular","whatsapp","fone","phone","cel","tel","contato","nr_telefone"],
  email: ["email","e-mail","correio","mail"],
  uf: ["uf","estado","sigla_uf","sg_uf"],
  cidade: ["cidade","municipio","city","nm_municipio"],
  numeroBeneficio: ["beneficio","nb","numero_beneficio","mat","matricula","nr_beneficio","numbeneficio"],
  especieBeneficio: ["especie","esp","cod_especie","especiebeneficio"],
  margemLivre: ["margem","margem_livre","vlr_margem","margemlivre","vl_margem_livre","valorprincipal"],
  margemRmc: ["margem_rmc","rmc","cartao_rmc","vl_margem_rmc"],
  margemRcc: ["margem_rcc","rcc","cartao_rcc","vl_margem_rcc"],
  bancoAtual: ["banco","banco_atual","inst_financeira","bancoorigem"],
  parcelaAtual: ["parcela","vlr_parcela","vl_parcela"],
  saldoDevedor: ["saldo","saldo_devedor","vlr_saldo","vl_saldo","saldodevedor"],
  tipoOperacao: ["tipo","operacao","tipo_operacao","produto","tipodeoperacao","tipodeoperação"],
  origem: ["origem","canal","source","fonte"],
  dataDigitacao: ["datadigitacao","datadigitação","data_digitacao","dtdigitacao","digitacao"],
  codigoPropostaBanco: ["ade","contrato","proposta","nr_contrato","codigoproposta","numeroproposta"],
  promotora: ["promotora","loja","correspondente","subestabelecida"],
  convenioNome: ["convenio","convênio","conv","convenionome"],
  valorLiberado: ["valorliberado","valor_liberado","vl_liberado","vlrliberado"],
  statusImport: ["status","situacao","situação"],
  retornoSaldo: ["retornosaldo","retorno_saldo","retorno"],
  vendedorNome: ["vendedor","vendedornome","operador"],
  loginDigitador: ["logindigitador","digitador","login_digitador","usuario"],
  dataStatus: ["datadostatus","data_do_status","datastatus","data_status"],
  tabela: ["tabela","tab","tabelacoeficiente"],
};

export const FIELD_LABELS: Record<string, string> = {
  nome: "Nome", cpf: "CPF", telefone: "Telefone", email: "Email",
  uf: "UF", cidade: "Cidade", numeroBeneficio: "Nº Benefício",
  especieBeneficio: "Espécie", margemLivre: "Margem Livre",
  margemRmc: "Margem RMC", margemRcc: "Margem RCC",
  bancoAtual: "Banco Atual", parcelaAtual: "Parcela Atual",
  saldoDevedor: "Saldo Devedor", tipoOperacao: "Tipo Operação",
  origem: "Origem", dataDigitacao: "Data Digitação",
  codigoPropostaBanco: "ADE / Contrato", promotora: "Promotora",
  convenioNome: "Convênio", valorLiberado: "Valor Liberado",
  statusImport: "Status", retornoSaldo: "Retorno Saldo",
  vendedorNome: "Vendedor", loginDigitador: "Login Digitador",
  dataStatus: "Data do Status", tabela: "Tabela",
};

export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalized = headers.map(h => h.toLowerCase().replace(/[\s_\-."']/g, ""));
  const used = new Set<string>();

  for (const [field, aliases] of Object.entries(FIELD_MAP)) {
    for (let i = 0; i < normalized.length; i++) {
      if (used.has(headers[i])) continue;
      const norm = normalized[i];
      if (aliases.some(a => a.replace(/[\s_\-]/g, "") === norm)) {
        mapping[headers[i]] = field;
        used.add(headers[i]);
        break;
      }
    }
  }
  return mapping;
}

export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let rem = (sum * 10) % 11; if (rem >= 10) rem = 0;
  if (rem !== parseInt(clean[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  rem = (sum * 10) % 11; if (rem >= 10) rem = 0;
  return rem === parseInt(clean[10]);
}

export type ImportRow = Record<string, string>;
export type MappedLead = {
  _idx: number;
  _errors: string[];
  _isDuplicate: boolean;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  uf?: string;
  cidade?: string;
  numeroBeneficio?: string;
  especieBeneficio?: number;
  margemLivre?: number;
  margemRmc?: number;
  margemRcc?: number;
  bancoAtual?: string;
  parcelaAtual?: number;
  saldoDevedor?: number;
  tipoOperacao?: string;
  origem?: string;
  dataDigitacao?: string;
  codigoPropostaBanco?: string;
  promotora?: string;
  convenioNome?: string;
  valorLiberado?: number;
  statusImport?: string;
  retornoSaldo?: string;
  vendedorNome?: string;
  loginDigitador?: string;
  dataStatus?: string;
  tabela?: string;
};

const NUM_FIELDS = ["especieBeneficio","margemLivre","margemRmc","margemRcc","parcelaAtual","saldoDevedor","valorLiberado"];
const STR_FIELDS = ["telefone","email","uf","cidade","numeroBeneficio","bancoAtual","tipoOperacao","origem","dataDigitacao","codigoPropostaBanco","promotora","convenioNome","statusImport","retornoSaldo","vendedorNome","loginDigitador","dataStatus","tabela"];

export function applyMapping(rows: ImportRow[], mapping: Record<string,string>): MappedLead[] {
  const reverseMap: Record<string,string> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (field && field !== "_ignorar") reverseMap[field] = header;
  }

  return rows.map((row, idx) => {
    const errors: string[] = [];
    const nome = row[reverseMap["nome"]] || "";
    if (!nome.trim()) errors.push("Nome vazio");

    const cpfRaw = String(row[reverseMap["cpf"]] ?? "").trim();
    // Pad com zeros à esquerda (Excel remove zeros de números)
    let cpf = cpfRaw.replace(/\D/g, "");
    if (cpf && cpf.length < 11 && cpf.length >= 9) cpf = cpf.padStart(11, "0");
    if (cpf && cpf.length !== 11) errors.push(`CPF inválido (${cpf.length} dígitos: ${cpfRaw})`);

    const lead: MappedLead = {
      _idx: idx, _errors: errors, _isDuplicate: false,
      nome: nome.trim(),
    };

    if (cpf) lead.cpf = cpf;
    for (const f of STR_FIELDS) {
      const v = row[reverseMap[f]]?.trim();
      if (v) (lead as any)[f] = v;
    }
    for (const f of NUM_FIELDS) {
      const raw = row[reverseMap[f]];
      if (!raw) continue;
      // Brazilian format: 10.044,90 → remove R$, spaces, then handle dots/comma
      let v = String(raw).replace(/[R$\s]/g, "").trim();
      // If has comma (Brazilian decimal), remove dots (thousands) then replace comma with dot
      if (v.includes(",")) {
        v = v.replace(/\./g, "").replace(",", ".");
      }
      if (v && !isNaN(Number(v))) (lead as any)[f] = Number(v);
    }

    return lead;
  });
}
