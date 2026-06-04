"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Phone, Mail, Paperclip, Trash2, UploadCloud, FileText, MessageCircle, MessageSquare, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf[10]);
}

function calcularIdade(dataNasc: string): number | null {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function mascaraCep(v: string): string {
  return v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
}

const WHATSAPP_SCRIPTS = [
  { id: 'oferta', label: 'Nova Oferta (Isca)', template: 'Olá {nome}, vi que você tem uma margem livre interessante. Podemos fazer uma simulação rápida sem compromisso?' },
  { id: 'aprovado', label: 'Proposta Aprovada', template: 'Boas notícias {nome}! Sua proposta no banco {banco} foi aprovada com sucesso. 🎉' },
  { id: 'documento', label: 'Falta de Documentos', template: 'Oi {nome}, tudo bem? Para darmos andamento na sua proposta, preciso que você me envie uma foto do seu RG.' },
  { id: 'link_dig', label: 'Link de Digitação', template: 'Olá {nome}, segue o link seguro do banco {banco} para você realizar a biometria facial e assinar o contrato digital: ' }
];

const mascaraCpf = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').substring(0, 14);

const mascaraTelefone = (v: string) => {
  v = v.replace(/\D/g, '');
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').substring(0, 15);
};

const formatMoedaInput = (v: string) => {
  v = v.replace(/\D/g, "");
  const num = (Number(v) / 100).toFixed(2);
  return num;
};

const getWhatsAppLink = (telefone: string | null, text: string = "") => {
  if (!telefone) return "#";
  const num = telefone.replace(/\D/g, '');
  return `https://wa.me/55${num}?text=${encodeURIComponent(text)}`;
};

const formataErroZod = (errStr: string) => {
  try {
    const p = JSON.parse(errStr);
    if (Array.isArray(p)) {
      return p.map(e => `Campo ${e.path.join('.')}: ${e.message}`).join(' | ');
    }
  } catch { }
  return errStr;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const INSS_ESPECIES = [
  { id: 1, nome: "Aposentadoria por Invalidez" },
  { id: 2, nome: "Aposentadoria por Idade" },
  { id: 3, nome: "Aposentadoria por Tempo de Serviço" },
  { id: 4, nome: "Aposentadoria Especial" },
  { id: 5, nome: "Pensão por Morte" },
  { id: 6, nome: "Auxílio-Doença" },
  { id: 7, nome: "Auxílio-Reclusão" },
  { id: 8, nome: "Salário-Maternidade" },
  { id: 21, nome: "Pensão por Morte Previdenciária" },
  { id: 22, nome: "Pensão por Morte Estatutária" },
  { id: 23, nome: "Pensão por Morte de Ex-Combatente" },
  { id: 25, nome: "Auxílio-Reclusão" },
  { id: 31, nome: "Auxílio-Doença Previdenciário" },
  { id: 32, nome: "Aposentadoria por Invalidez Previdenciária" },
  { id: 33, nome: "Aposentadoria por Invalidez de Ex-Combatente" },
  { id: 36, nome: "Auxílio-Acidente Previdenciário" },
  { id: 41, nome: "Aposentadoria por Idade" },
  { id: 42, nome: "Aposentadoria por Tempo de Contribuição" },
  { id: 43, nome: "Aposentadoria por Tempo de Serviço de Professor" },
  { id: 44, nome: "Aposentadoria por Tempo de Serviço de Jornalista" },
  { id: 46, nome: "Aposentadoria Especial" },
  { id: 51, nome: "Auxílio-Doença Acidentário" },
  { id: 52, nome: "Aposentadoria por Invalidez Acidentária" },
  { id: 53, nome: "Pensão por Morte Acidentária" },
  { id: 54, nome: "Auxílio-Suplementar por Acidente de Trabalho" },
  { id: 55, nome: "Pecúlio por Invalidez (Acidente de Trabalho)" },
  { id: 56, nome: "Auxílio-Acidente" },
  { id: 57, nome: "Aposentadoria por Tempo de Contribuição de Professor" },
  { id: 72, nome: "Aposentadoria por Tempo de Serviço de Ex-Combatente" },
  { id: 78, nome: "Aposentadoria por Idade Rural" },
  { id: 80, nome: "Salário-Maternidade" },
  { id: 81, nome: "Aposentadoria por Idade (LC 142/2013 - PCD)" },
  { id: 82, nome: "Aposentadoria por Tempo de Contribuição (LC 142/2013 - PCD)" },
  { id: 83, nome: "Aposentadoria por Idade do Trabalhador Rural" },
  { id: 87, nome: "Amparo Social à Pessoa com Deficiência (LOAS/BPC)" },
  { id: 88, nome: "Amparo Social ao Idoso (LOAS/BPC)" },
  { id: 89, nome: "Pensão Especial (Hanseníase)" },
  { id: 91, nome: "Auxílio-Doença por Acidente de Trabalho" },
  { id: 92, nome: "Aposentadoria por Invalidez por Acidente de Trabalho" },
  { id: 93, nome: "Pensão por Morte por Acidente de Trabalho" },
  { id: 94, nome: "Auxílio-Suplementar por Acidente de Trabalho" },
  { id: 95, nome: "Auxílio-Acidente por Acidente de Trabalho" },
  { id: 96, nome: "Pensão Especial para Portadores de Síndrome da Talidomida" },
  { id: 97, nome: "Pecúlio por Morte Acidentária" },
  { id: 99, nome: "Pensão Especial Vitalícia" },
];

export const BANCOS_BRASIL = [
  { compe: "001", nome: "Banco do Brasil" },
  { compe: "003", nome: "Banco da Amazônia" },
  { compe: "004", nome: "Banco do Nordeste" },
  { compe: "010", nome: "Credicoamo" },
  { compe: "011", nome: "Credit Suisse" },
  { compe: "012", nome: "Banco Inbursa" },
  { compe: "014", nome: "State Street Brasil" },
  { compe: "015", nome: "UBS Brasil" },
  { compe: "016", nome: "Sicoob Creditran" },
  { compe: "017", nome: "BNY Mellon" },
  { compe: "018", nome: "Banco Tricury" },
  { compe: "021", nome: "Banestes" },
  { compe: "024", nome: "Banco Bandepe" },
  { compe: "025", nome: "Banco Alfa" },
  { compe: "029", nome: "Banco Itaú Consignado" },
  { compe: "033", nome: "Banco Santander" },
  { compe: "036", nome: "Banco Bradesco BBI" },
  { compe: "037", nome: "Banco do Estado do Pará" },
  { compe: "040", nome: "Banco Cargill" },
  { compe: "041", nome: "Banrisul" },
  { compe: "047", nome: "Banco do Estado de Sergipe" },
  { compe: "060", nome: "Confidence Câmbio" },
  { compe: "062", nome: "Hipercard" },
  { compe: "063", nome: "Banco Bradescard" },
  { compe: "064", nome: "Goldman Sachs Brasil" },
  { compe: "065", nome: "Banco AndBank" },
  { compe: "066", nome: "Banco Morgan Stanley" },
  { compe: "069", nome: "Banco Crefisa" },
  { compe: "070", nome: "BRB - Banco de Brasília" },
  { compe: "074", nome: "Banco J. Safra" },
  { compe: "075", nome: "Banco ABN Amro" },
  { compe: "076", nome: "Banco KDB Brasil" },
  { compe: "077", nome: "Banco Inter" },
  { compe: "078", nome: "Haitong Brasil" },
  { compe: "079", nome: "Banco Original do Agro" },
  { compe: "080", nome: "B&T Corretora" },
  { compe: "081", nome: "BBN Banco Brasileiro" },
  { compe: "082", nome: "Banco Topázio" },
  { compe: "083", nome: "Banco da China Brasil" },
  { compe: "084", nome: "Uniprime Norte do Paraná" },
  { compe: "085", nome: "Cooperativa Central Ailos" },
  { compe: "089", nome: "Credisan" },
  { compe: "091", nome: "Unicred Central RS" },
  { compe: "092", nome: "BRK Financeira" },
  { compe: "093", nome: "PóloCred" },
  { compe: "094", nome: "Banco Finaxis" },
  { compe: "095", nome: "Travelex Banco de Câmbio" },
  { compe: "096", nome: "Banco B3" },
  { compe: "097", nome: "Credisis" },
  { compe: "098", nome: "Credialiança" },
  { compe: "099", nome: "Uniprime Central" },
  { compe: "100", nome: "Planner" },
  { compe: "101", nome: "Renascença" },
  { compe: "102", nome: "XP Investimentos" },
  { compe: "104", nome: "Caixa Econômica Federal" },
  { compe: "105", nome: "Lecca" },
  { compe: "107", nome: "Banco Bocom BBM" },
  { compe: "108", nome: "PortoCred" },
  { compe: "111", nome: "Oliveira Trust" },
  { compe: "113", nome: "Magliano" },
  { compe: "114", nome: "Central das Coop. Economia e Crédito" },
  { compe: "117", nome: "Advanced" },
  { compe: "119", nome: "Banco Western Union" },
  { compe: "120", nome: "Banco Rodobens" },
  { compe: "121", nome: "Banco Agibank" },
  { compe: "122", nome: "Banco Bradesco BERJ" },
  { compe: "124", nome: "Banco Woori Bank" },
  { compe: "125", nome: "Banco Genial" },
  { compe: "126", nome: "BR Partners" },
  { compe: "127", nome: "Codepe" },
  { compe: "128", nome: "MS Bank" },
  { compe: "129", nome: "UBS Brasil BI" },
  { compe: "130", nome: "Caruana" },
  { compe: "131", nome: "Tullett Prebon" },
  { compe: "132", nome: "ICBC do Brasil" },
  { compe: "133", nome: "Confederação Nac. Coop. Centrais de Crédito" },
  { compe: "134", nome: "BGC Liquidez" },
  { compe: "136", nome: "Unicred do Brasil" },
  { compe: "137", nome: "Multimoney" },
  { compe: "138", nome: "Get Money" },
  { compe: "139", nome: "Intesa Sanpaolo Brasil" },
  { compe: "140", nome: "Easynvest" },
  { compe: "142", nome: "Broker Brasil" },
  { compe: "143", nome: "Treviso" },
  { compe: "144", nome: "Bexs Banco de Câmbio" },
  { compe: "145", nome: "Levycam" },
  { compe: "146", nome: "Guitta" },
  { compe: "149", nome: "Facta Financeira" },
  { compe: "157", nome: "ICAP do Brasil" },
  { compe: "159", nome: "Casa do Crédito" },
  { compe: "163", nome: "Commerzbank Brasil" },
  { compe: "169", nome: "Banco Olé Consignado" },
  { compe: "173", nome: "BRL Trust" },
  { compe: "174", nome: "Pefisa" },
  { compe: "177", nome: "Guide" },
  { compe: "180", nome: "CM Capital Markets" },
  { compe: "183", nome: "Socred" },
  { compe: "184", nome: "Banco Itaú BBA" },
  { compe: "188", nome: "Ativa Investimentos" },
  { compe: "189", nome: "HS Financeira" },
  { compe: "190", nome: "Cooperativa de Economia Servicred" },
  { compe: "191", nome: "Nova Futura" },
  { compe: "194", nome: "Parmetal" },
  { compe: "196", nome: "Fair" },
  { compe: "197", nome: "Stone Pagamentos" },
  { compe: "208", nome: "Banco BTG Pactual" },
  { compe: "212", nome: "Banco Original" },
  { compe: "213", nome: "Banco Arbi" },
  { compe: "217", nome: "Banco John Deere" },
  { compe: "218", nome: "Banco BS2" },
  { compe: "222", nome: "Banco Credit Agricole" },
  { compe: "224", nome: "Banco Fibra" },
  { compe: "233", nome: "Banco Cifra" },
  { compe: "237", nome: "Banco Bradesco" },
  { compe: "241", nome: "Banco Clássico" },
  { compe: "243", nome: "Banco Máxima" },
  { compe: "246", nome: "Banco ABC Brasil" },
  { compe: "249", nome: "Banco Investcred Unibanco" },
  { compe: "250", nome: "BCV - Banco de Crédito e Varejo" },
  { compe: "253", nome: "Bexs Corretora" },
  { compe: "254", nome: "Paraná Banco" },
  { compe: "259", nome: "Banco Moneycorp" },
  { compe: "260", nome: "Nu Pagamentos (Nubank)" },
  { compe: "265", nome: "Banco Fator" },
  { compe: "266", nome: "Banco Cédula" },
  { compe: "268", nome: "Barigui" },
  { compe: "269", nome: "HSBC Brasil" },
  { compe: "270", nome: "Sagitur" },
  { compe: "271", nome: "IB Corretora" },
  { compe: "272", nome: "AGK Corretora" },
  { compe: "273", nome: "Cooperativa de Crédito Rural de São Miguel" },
  { compe: "274", nome: "Money Plus" },
  { compe: "276", nome: "Banco Senff" },
  { compe: "278", nome: "Genial Investimentos" },
  { compe: "279", nome: "Cooperativa de Crédito Rural Coopavel" },
  { compe: "280", nome: "Avista" },
  { compe: "281", nome: "Cooperativa de Crédito Rural Coopersul" },
  { compe: "283", nome: "RB Investimentos" },
  { compe: "285", nome: "Frente Corretora" },
  { compe: "286", nome: "Cooperativa de Crédito Rural Ouro Verde" },
  { compe: "288", nome: "Carol" },
  { compe: "289", nome: "Decycash" },
  { compe: "290", nome: "PagSeguro" },
  { compe: "292", nome: "BS2 Distribuidora" },
  { compe: "293", nome: "Lastro RDV" },
  { compe: "296", nome: "Vision" },
  { compe: "298", nome: "Vips" },
  { compe: "299", nome: "Banco Sorocred" },
  { compe: "300", nome: "Banco de la Nación Argentina" },
  { compe: "301", nome: "BPP Instituição de Pagamento" },
  { compe: "306", nome: "Portopar" },
  { compe: "307", nome: "Terra Investimentos" },
  { compe: "309", nome: "Cambionet" },
  { compe: "310", nome: "VORTX" },
  { compe: "311", nome: "Dourada Corretora" },
  { compe: "312", nome: "Hscm" },
  { compe: "313", nome: "Amazônia Corretora" },
  { compe: "315", nome: "PI" },
  { compe: "318", nome: "Banco BMG" },
  { compe: "319", nome: "OM" },
  { compe: "320", nome: "China Construction Bank" },
  { compe: "321", nome: "Crefaz" },
  { compe: "322", nome: "Cooperativa de Crédito CCR de Abelardo Luz" },
  { compe: "323", nome: "Mercado Pago" },
  { compe: "324", nome: "Cartos" },
  { compe: "325", nome: "Órama" },
  { compe: "326", nome: "Parati" },
  { compe: "329", nome: "QI SCD" },
  { compe: "330", nome: "Banco Bari" },
  { compe: "331", nome: "Fram Capital" },
  { compe: "332", nome: "Acesso Soluções de Pagamento" },
  { compe: "335", nome: "Banco Digio" },
  { compe: "336", nome: "Banco C6" },
  { compe: "340", nome: "Super Pagamentos" },
  { compe: "341", nome: "Banco Itaú Unibanco" },
  { compe: "342", nome: "Creditas" },
  { compe: "343", nome: "FFA" },
  { compe: "348", nome: "Banco XP" },
  { compe: "349", nome: "AL5" },
  { compe: "350", nome: "Cooperativa de Crédito Rural Crehnor" },
  { compe: "352", nome: "Toro" },
  { compe: "354", nome: "Necton Investimentos" },
  { compe: "355", nome: "Ótimo" },
  { compe: "358", nome: "Midway" },
  { compe: "359", nome: "Zema Crédito" },
  { compe: "360", nome: "Trinus Capital" },
  { compe: "362", nome: "Cielo" },
  { compe: "363", nome: "Socopa" },
  { compe: "364", nome: "Gerencianet" },
  { compe: "365", nome: "Solidus" },
  { compe: "366", nome: "Banco Société Générale" },
  { compe: "368", nome: "Banco CSF (Carrefour)" },
  { compe: "370", nome: "Banco Mizuho" },
  { compe: "371", nome: "Warren" },
  { compe: "373", nome: "UP.P" },
  { compe: "374", nome: "Realize CFI" },
  { compe: "376", nome: "Banco J.P. Morgan" },
  { compe: "377", nome: "BMS" },
  { compe: "378", nome: "BBC Leasing" },
  { compe: "379", nome: "Cooperforte" },
  { compe: "380", nome: "PicPay" },
  { compe: "381", nome: "Banco Mercedes-Benz" },
  { compe: "382", nome: "Fiducia" },
  { compe: "383", nome: "Juno" },
  { compe: "384", nome: "Global SCM" },
  { compe: "385", nome: "Cooperativa de Crédito Rural Coopnore" },
  { compe: "386", nome: "Nu Financeira" },
  { compe: "387", nome: "Banco Toyota" },
  { compe: "389", nome: "Banco Mercantil do Brasil" },
  { compe: "390", nome: "Banco GM" },
  { compe: "391", nome: "Cooperativa de Crédito Rural CCR São Miguel" },
  { compe: "393", nome: "Banco Volkswagen" },
  { compe: "394", nome: "Banco Bradesco Financiamentos" },
  { compe: "395", nome: "F.D'Gold" },
  { compe: "396", nome: "Hub Pagamentos" },
  { compe: "397", nome: "Listo" },
  { compe: "399", nome: "Kirton Bank" },
  { compe: "400", nome: "Cooperativa de Crédito Rural Cresol" },
  { compe: "401", nome: "Iugu" },
  { compe: "403", nome: "Cora" },
  { compe: "404", nome: "Sumup" },
  { compe: "406", nome: "Accredito" },
  { compe: "407", nome: "Índigo Investimentos" },
  { compe: "408", nome: "Bônuscred" },
  { compe: "410", nome: "Planner Sociedade de Crédito" },
  { compe: "411", nome: "Via Certa Financiadora" },
  { compe: "412", nome: "Banco Capital" },
  { compe: "413", nome: "Banco BV" },
  { compe: "414", nome: "Work" },
  { compe: "416", nome: "Banco Letsbank" },
  { compe: "418", nome: "Zipdin" },
  { compe: "419", nome: "Banco Pan" },
  { compe: "422", nome: "Banco Safra" },
  { compe: "428", nome: "Cresol Confederação" },
  { compe: "456", nome: "Banco MUFG Brasil" },
  { compe: "464", nome: "Banco Sumitomo Mitsui" },
  { compe: "473", nome: "Banco Caixa Geral" },
  { compe: "477", nome: "Citibank" },
  { compe: "479", nome: "Banco ItauBank" },
  { compe: "487", nome: "Deutsche Bank" },
  { compe: "488", nome: "JPMorgan Chase" },
  { compe: "492", nome: "ING Bank" },
  { compe: "495", nome: "Banco de La Provincia" },
  { compe: "505", nome: "Banco Credit Suisse" },
  { compe: "545", nome: "Senso" },
  { compe: "600", nome: "Banco Luso Brasileiro" },
  { compe: "604", nome: "Banco Industrial do Brasil" },
  { compe: "610", nome: "Banco VR" },
  { compe: "611", nome: "Banco Paulista" },
  { compe: "612", nome: "Banco Guanabara" },
  { compe: "613", nome: "Omni Banco" },
  { compe: "623", nome: "Banco Pan" },
  { compe: "626", nome: "Banco C6 Consignado" },
  { compe: "630", nome: "Smartbank" },
  { compe: "633", nome: "Banco Rendimento" },
  { compe: "634", nome: "Banco Triângulo" },
  { compe: "637", nome: "Banco Sofisa" },
  { compe: "643", nome: "Banco Pine" },
  { compe: "652", nome: "Itaú Unibanco Holding" },
  { compe: "653", nome: "Banco Indusval" },
  { compe: "654", nome: "Banco A.J. Renner" },
  { compe: "655", nome: "Banco Votorantim (BV)" },
  { compe: "707", nome: "Banco Daycoval" },
  { compe: "712", nome: "Banco Ourinvest" },
  { compe: "735", nome: "Banco Neon" },
  { compe: "739", nome: "Banco Cetelem" },
  { compe: "741", nome: "Banco Ribeirão Preto" },
  { compe: "743", nome: "Banco Semear" },
  { compe: "745", nome: "Banco Citibank" },
  { compe: "746", nome: "Banco Modal" },
  { compe: "747", nome: "Banco Rabobank" },
  { compe: "748", nome: "Sicredi" },
  { compe: "751", nome: "Scotiabank Brasil" },
  { compe: "752", nome: "Banco BNP Paribas" },
  { compe: "753", nome: "Novo Banco Continental" },
  { compe: "754", nome: "Banco Sistema" },
  { compe: "755", nome: "Bank of America Merrill Lynch" },
  { compe: "756", nome: "Sicoob" },
  { compe: "757", nome: "Banco KEB Hana" },
];

type LeadFormModalProps = {
  open: boolean;
  onClose: () => void;
  leadSelecionado?: any | null; // if null, creates new
  bancos: { id: string, nome: string }[];
  convenios: { id: string, nome: string }[];
  perfilUsuario?: string;
  onSuccess: (lead: any) => void;
  onDelete?: (id: string) => void;
  initialNome?: string;
};

export function LeadFormModal({
  open,
  onClose,
  leadSelecionado,
  bancos = [],
  convenios = [],
  perfilUsuario,
  onSuccess,
  onDelete,
  initialNome = "",
}: LeadFormModalProps) {
  const router = useRouter();
  
  const [form, setForm] = useState({
    id: "", nome: "", cpf: "", telefone: "", email: "", uf: "", cidade: "",
    dataNascimento: "", renda: "", ddb: "",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
    numeroBeneficio: "", especieBeneficio: "", margemLivre: "", margemRmc: "", margemRcc: "",
    tipoOperacao: "", valorLiberado: "", bancoPreferido: "", convenioNome: "",
    bancoCliente: "", agenciaCliente: "", contaCliente: "", tipoContaCliente: "",
    origem: "manual", canalContato: "", observacoes: "",
    arquivosExistem: [] as any[],
  });

  const [revelarCpf, setRevelarCpf] = useState(false);
  const [revelarTel, setRevelarTel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cpfErro, setCpfErro] = useState<string | null>(null);

  // AI States
  const [tabModal, setTabModal] = useState<"dados" | "refin" | "inss">("dados");
  const [textoHiscon, setTextoHiscon] = useState("");
  const [analisandoHiscon, setAnalisandoHiscon] = useState(false);
  const [resultadoRefin, setResultadoRefin] = useState<any>(null);
  const [validandoDoc, setValidandoDoc] = useState<string | null>(null);

  // IBGE States
  const [estadosIBGE, setEstadosIBGE] = useState<any[]>([]);
  const [cidadesIBGE, setCidadesIBGE] = useState<any[]>([]);

  // Files State
  const [arquivosPendentes, setArquivosPendentes] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Banco Cliente search
  const [bancoClienteQuery, setBancoClienteQuery] = useState("");
  const [showBancoDropdown, setShowBancoDropdown] = useState(false);
  const bancoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then(res => res.json())
      .then(data => setEstadosIBGE(data));
  }, []);

  useEffect(() => {
    if (form.uf) {
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.uf}/municipios`)
        .then(res => res.json())
        .then(data => setCidadesIBGE(data));
    } else {
      setCidadesIBGE([]);
    }
  }, [form.uf]);

  useEffect(() => {
    if (open) {
      if (leadSelecionado) {
        const l = leadSelecionado;
        setForm({
          id: l.id,
          nome: l.nome,
          cpf: l.cpf ? mascaraCpf(l.cpf) : "",
          telefone: l.telefone ? mascaraTelefone(l.telefone) : "",
          email: l.email || "",
          uf: l.uf || "",
          cidade: l.cidade || "",
          dataNascimento: l.dataNascimento ? new Date(l.dataNascimento).toISOString().split('T')[0] : "",
          renda: l.renda ? l.renda.toString() : "",
          ddb: l.ddb ? new Date(l.ddb).toISOString().split('T')[0] : "",
          cep: l.cep || "",
          logradouro: l.logradouro || "",
          numero: l.numero || "",
          complemento: l.complemento || "",
          bairro: l.bairro || "",
          numeroBeneficio: l.numeroBeneficio || "",
          especieBeneficio: l.especieBeneficio ? l.especieBeneficio.toString() : "",
          margemLivre: l.margemLivre ? l.margemLivre.toString() : "",
          margemRmc: l.margemRmc ? l.margemRmc.toString() : "",
          margemRcc: l.margemRcc ? l.margemRcc.toString() : "",
          tipoOperacao: l.tipoOperacao || "",
          valorLiberado: l.valorLiberado ? l.valorLiberado.toString() : "",
          bancoPreferido: l.bancoPreferido || "",
          convenioNome: l.convenioNome || "",
          bancoCliente: l.bancoCliente || "",
          agenciaCliente: l.agenciaCliente || "",
          contaCliente: l.contaCliente || "",
          tipoContaCliente: l.tipoContaCliente || "",
          origem: l.origem || "manual",
          canalContato: l.canalContato || "",
          observacoes: l.observacoes || "",
          arquivosExistem: l.arquivos || [],
        });
      } else {
        setForm({
          id: "", nome: initialNome, cpf: "", telefone: "", email: "", uf: "", cidade: "",
          dataNascimento: "", renda: "", ddb: "",
          cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
          numeroBeneficio: "", especieBeneficio: "", margemLivre: "", margemRmc: "", margemRcc: "",
          tipoOperacao: "", valorLiberado: "", bancoPreferido: "", convenioNome: "",
          bancoCliente: "", agenciaCliente: "", contaCliente: "", tipoContaCliente: "",
          origem: "manual", canalContato: "", observacoes: "", arquivosExistem: []
        });
      }
      setArquivosPendentes([]);
      setCpfErro(null);
      setErro(null);
      setTabModal("dados");
      setBancoClienteQuery("");
    }
  }, [open, leadSelecionado, initialNome]);

  if (!open) return null;

  async function analisarHiscon() {
    if (!textoHiscon) return;
    setAnalisandoHiscon(true);
    try {
      const res = await fetch("/api/ai/refin-hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textoHiscon })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResultadoRefin(data);
      toast.success("Oportunidades encontradas com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao analisar HISCON");
    } finally {
      setAnalisandoHiscon(false);
    }
  }

  async function gerarPropostaUmClique(op: any) {
    if (!form.id) return toast.error("Salve o lead antes de gerar a proposta.");

    let tipoOperacao = "PORTABILIDADE";
    if (op.acaoSugerida?.toLowerCase().includes("refin")) tipoOperacao = "REFINANCIAMENTO";

    try {
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome: form.nome,
          clienteCpf: form.cpf ? form.cpf.replace(/\D/g, '') : undefined,
          clienteTelefone: form.telefone,
          numeroBeneficio: form.numeroBeneficio,
          especieBeneficio: form.especieBeneficio ? Number(form.especieBeneficio) : undefined,
          leadId: form.id,
          tipoOperacao,
          bancoNome: op.bancoOrigem,
          valorParcela: Number(op.parcelaAtual) || 0,
          valorLiberado: Number(op.trocoEstimado) || 0,
          observacoes: `Gerada via Refin Hunter. Motivo IA: ${op.motivo}`,
        })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("🚀 Proposta Rascunho gerada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar proposta.");
    }
  }

  async function validarDocumento(fileUrl: string) {
    setValidandoDoc(fileUrl);
    try {
      const res = await fetch("/api/ai/ocr-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: fileUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const cpfLead = form.cpf ? form.cpf.replace(/\D/g, '') : null;
      const confereCpf = data.cpfExtraido && cpfLead && data.cpfExtraido.includes(cpfLead);

      toast.custom(() => (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl max-w-sm">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-2">
            ✨ Validação Concluída
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1"><strong>Doc:</strong> {data.tipoDocumento}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1"><strong>Nome:</strong> {data.nomeExtraido || "N/A"}</p>
          <p className={`text-xs font-bold ${confereCpf ? 'text-emerald-600' : 'text-amber-600'} mb-2`}>
            {confereCpf ? '✅ CPF exato.' : '⚠️ Atenção: CPF não identificado ou divergente.'}
          </p>
          <p className={`text-[10px] p-2 rounded ${data.legivel ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {data.observacoes}
          </p>
        </div>
      ), { duration: 10000 });

    } catch (err: any) {
      toast.error(err.message || "Erro na validação do documento.");
    } finally {
      setValidandoDoc(null);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setArquivosPendentes(prev => [...prev, ...filesArr]);
    }
  };

  const removerArquivoPendente = (index: number) => {
    setArquivosPendentes(prev => prev.filter((_, i) => i !== index));
  };

  async function salvarLead(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const payload: any = { ...form };
    delete payload.arquivosExistem; 

    if (payload.cpf) payload.cpf = payload.cpf.replace(/\D/g, '');
    if (payload.telefone) payload.telefone = payload.telefone.replace(/\D/g, '');

    Object.keys(payload).forEach(key => {
      if (payload[key] === "") payload[key] = undefined;
    });

    let base64Files: any[] = [];
    if (arquivosPendentes.length > 0) {
      try {
        base64Files = await Promise.all(
          arquivosPendentes.map(async file => {
            const base64 = await fileToBase64(file);
            return { nome: file.name, tipo: file.type, tamanho: file.size, url: base64 };
          })
        );
      } catch (err) {
        setErro("Erro ao ler arquivos anexados. Tente novamente.");
        setSalvando(false);
        return;
      }
    }

    const bodyData = {
      ...payload,
      valorLiberado: payload.valorLiberado ? Number(payload.valorLiberado) : undefined,
      especieBeneficio: payload.especieBeneficio ? Number(payload.especieBeneficio) : undefined,
      margemLivre: payload.margemLivre ? Number(payload.margemLivre.replace(',', '.')) : undefined,
      margemRmc: payload.margemRmc ? Number(payload.margemRmc.replace(',', '.')) : undefined,
      margemRcc: payload.margemRcc ? Number(payload.margemRcc.replace(',', '.')) : undefined,
      renda: payload.renda ? Number(payload.renda) : undefined,
      cep: payload.cep ? payload.cep.replace(/\D/g, '') : undefined,
      arquivos: base64Files.length > 0 ? base64Files : undefined
    };

    const isEdit = !!form.id;
    const url = isEdit ? `/api/leads/${form.id}` : "/api/leads";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const data = await res.json();
        setErro(formataErroZod(data.error)); 
        setSalvando(false); 
        return;
      }

      const savedLead = await res.json();
      toast.success(isEdit ? "Lead atualizado com sucesso!" : "Lead criado com sucesso!");
      setSalvando(false);
      onSuccess(savedLead);
    } catch (e: any) {
      setErro(e.message || "Erro de conexão ao salvar lead");
      setSalvando(false);
    }
  }

  async function handleDeleteLead() {
    if (!form.id || !onDelete) return;
    if (!confirm("Tem certeza que deseja excluir permanentemente este lead?")) return;
    setSalvando(true);
    try {
      const res = await fetch(`/api/leads/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error || "Erro ao excluir lead");
        setSalvando(false);
        return;
      }
      toast.success("Lead excluído com sucesso!");
      onDelete(form.id);
    } catch (e: any) {
      setErro(e.message || "Erro de conexão ao deletar");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{form.id ? "Editar Lead" : "Novo Cliente"}</h2>
            {form.telefone && (
              <div className="relative group">
                <button type="button" className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                  <MessageCircle className="w-4 h-4" /> Chamar
                </button>
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                  <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-700 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Roteiros Rápidos
                  </div>
                  {WHATSAPP_SCRIPTS.map(script => (
                    <a
                      key={script.id}
                      target="_blank" rel="noreferrer"
                      href={getWhatsAppLink(form.telefone, script.template.replace('{nome}', form.nome ? form.nome.split(' ')[0] : 'Cliente').replace('{banco}', form.bancoPreferido || 'banco'))}
                      className="block px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition border-b border-zinc-100 dark:border-zinc-700 last:border-0"
                    >
                      {script.label}
                    </a>
                  ))}
                  <a
                    target="_blank" rel="noreferrer"
                    href={getWhatsAppLink(form.telefone, "")}
                    className="block px-4 py-2 text-xs font-semibold text-brand hover:bg-brand/10 transition bg-zinc-50 dark:bg-zinc-900/50"
                  >
                    Abrir conversa vazia ↗
                  </a>
                </div>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center gap-6 px-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => setTabModal("dados")}
            className={`py-3 text-sm font-bold border-b-2 transition ${tabModal === "dados" ? "border-brand text-brand" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
          >
            Dados do Cliente
          </button>
          <button
            type="button"
            onClick={() => setTabModal("refin")}
            className={`py-3 text-sm font-bold border-b-2 flex items-center gap-1 transition ${tabModal === "refin" ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
          >
            ✨ Refin Hunter
          </button>
          <button
            type="button"
            onClick={() => setTabModal("inss")}
            className={`py-3 text-sm font-bold border-b-2 flex items-center gap-1 transition ${tabModal === "inss" ? "border-blue-500 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
          >
            Gov.br Extrator
          </button>
        </div>

        {tabModal === "refin" && (
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950/50">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="font-bold text-lg text-amber-600 mb-2 flex items-center gap-2">
                  🤖 Motor de Inteligência Comercial
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Cole o texto bruto do extrato HISCON (INSS) do cliente abaixo. A IA vai analisar os contratos ativos e caçar oportunidades de Refinanciamento ou Portabilidade com troco.
                </p>
                <textarea
                  value={textoHiscon}
                  onChange={e => setTextoHiscon(e.target.value)}
                  placeholder="Cole o HISCON aqui..."
                  className="w-full h-40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-amber-500 font-mono resize-none mb-4"
                />
                <button
                  type="button"
                  onClick={analisarHiscon}
                  disabled={analisandoHiscon || !textoHiscon}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
                >
                  {analisandoHiscon ? <Loader2 className="w-5 h-5 animate-spin" /> : "Caçar Oportunidades ✨"}
                </button>
              </div>

              {resultadoRefin && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                      {resultadoRefin.analiseGeral}
                    </p>
                  </div>
                  <h4 className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-xs">Oportunidades Encontradas:</h4>
                  {resultadoRefin.oportunidades?.map((op: any, i: number) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-amber-200 shadow-lg shadow-amber-500/10">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1 inline-block">
                            {op.acaoSugerida}
                          </span>
                          <h4 className="font-black text-lg">{op.bancoOrigem}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">Troco Estimado</p>
                          <p className="text-xl font-black text-emerald-600">R$ {op.trocoEstimado}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Parcela Atual</p>
                          <p className="font-medium">R$ {op.parcelaAtual}</p>
                        </div>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Saldo Devedor</p>
                          <p className="font-medium">R$ {op.saldoDevedorEstimado}</p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3 mb-4">
                        💡 <strong>Motivo:</strong> {op.motivo}
                      </p>
                      <button
                        type="button"
                        onClick={() => gerarPropostaUmClique(op)}
                        className="w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                      >
                        🚀 Gerar Proposta {op.acaoSugerida.includes('Refin') ? 'de Refinanciamento' : 'de Portabilidade'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tabModal === "inss" && (
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-black">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="bg-white text-blue-600 px-2 py-0.5 rounded text-xs uppercase tracking-wider font-black">Gov.br</span>
                  Extrator Inteligente INSS
                </h2>
                <p className="text-blue-100 text-sm">
                  Conecte diretamente ao Meu INSS do cliente. Nossa automação RPA entrará no portal, quebrará os captchas, fará o download do HISCON (Extrato de Empréstimos) e importará todas as margens e contratos de volta para o Kromuz em alguns minutos.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CPF do Cliente</label>
                    <input
                      value={form.cpf}
                      readOnly
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-zinc-500">O CPF é puxado automaticamente do cadastro do Lead.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha do Gov.br *</label>
                    <input
                      type="password"
                      placeholder="Digite a senha fornecida pelo cliente"
                      id="inss-senha-gov"
                      className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={async () => {
                        const senha = (document.getElementById('inss-senha-gov') as HTMLInputElement).value;
                        if (!senha) return alert("Digite a senha do Gov.br");
                        const btn = document.getElementById('btn-inss-enviar');
                        if (btn) { btn.innerHTML = "Enviando para o Robô..."; btn.setAttribute('disabled', 'true'); }
                        try {
                          const res = await fetch('/api/integracoes/meu-inss', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leadId: form.id, cpf: form.cpf, senha })
                          });
                          if (res.ok) {
                            alert("Sucesso! Tarefa enviada para a fila do robô RPA. O HISCON aparecerá nos anexos e no Refin Hunter quando concluído.");
                            setTabModal("refin");
                          } else {
                            throw new Error("Falha na api");
                          }
                        } catch (e) {
                          alert("Erro ao conectar com a fila RPA.");
                          if (btn) { btn.innerHTML = "Iniciar Extração Automática"; btn.removeAttribute('disabled'); }
                        }
                      }}
                      id="btn-inss-enviar"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m12 16 4-4-4-4" /><path d="M8 12h8" /></svg>
                      Iniciar Extração Automática
                    </button>
                    <p className="text-[10px] text-center text-zinc-400 mt-3 flex justify-center items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      As credenciais são criptografadas e descartadas após a extração.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={salvarLead} className={`flex-1 overflow-y-auto p-6 space-y-6 ${tabModal !== "dados" ? "hidden" : ""}`}>
          {erro && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">{erro}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Dados do Cliente</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Completo *</label>
                <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CPF</label>
                  <div className="relative group">
                    <input
                      type={revelarCpf ? "text" : "password"}
                      value={form.cpf}
                      readOnly={!revelarCpf}
                      onChange={e => {
                        const val = mascaraCpf(e.target.value);
                        setForm({ ...form, cpf: val });
                        const raw = val.replace(/\D/g, '');
                        if (raw.length === 11) {
                          setCpfErro(validarCPF(raw) ? null : "CPF inválido");
                        } else {
                          setCpfErro(null);
                        }
                      }}
                      placeholder="***.***.***-**"
                      maxLength={14}
                      className={`w-full rounded-lg border ${cpfErro ? 'border-red-400' : 'border-zinc-200'} bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 ${cpfErro ? 'focus:ring-red-400' : 'focus:ring-brand/100'} transition-all ${!revelarCpf ? 'blur-[3px] select-none' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!revelarCpf && form.id) {
                          fetch('/api/logs', { method: 'POST', body: JSON.stringify({ tipo: 'VISUALIZACAO_DADOS', recurso: 'LEAD', recursoId: form.id, descricao: 'Visualizou CPF do cliente' }) });
                        }
                        setRevelarCpf(!revelarCpf);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-brand transition"
                    >
                      {revelarCpf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {cpfErro && <p className="text-[11px] text-red-500 font-medium">⚠ {cpfErro}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Telefone</label>
                  <div className="relative">
                    <input
                      type={revelarTel ? "text" : "password"}
                      value={form.telefone}
                      readOnly={!revelarTel}
                      onChange={e => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
                      placeholder="(**) *****-****"
                      maxLength={15}
                      className={`w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100 transition-all ${!revelarTel ? 'blur-[3px] select-none' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!revelarTel && form.id) {
                          fetch('/api/logs', { method: 'POST', body: JSON.stringify({ tipo: 'VISUALIZACAO_DADOS', recurso: 'LEAD', recursoId: form.id, descricao: 'Visualizou Telefone do cliente' }) });
                        }
                        setRevelarTel(!revelarTel);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-brand transition"
                    >
                      {revelarTel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Data de Nascimento</label>
                  <div className="flex items-center gap-2">
                    <input type="date" value={form.dataNascimento} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} max={new Date().toISOString().split('T')[0]}
                      className="flex-1 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                    {form.dataNascimento && calcularIdade(form.dataNascimento) !== null && (
                      <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded-full whitespace-nowrap">
                        {calcularIdade(form.dataNascimento)} anos
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Renda (R$)</label>
                  <input type="number" step="0.01" value={form.renda} onChange={e => setForm({ ...form, renda: e.target.value })} placeholder="0.00"
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com"
                  className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">DDB — Início do Benefício</label>
                <input type="date" value={form.ddb} onChange={e => setForm({ ...form, ddb: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
              </div>

              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-4 mb-1">Endereço</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">CEP</label>
                  <input value={form.cep} maxLength={9}
                    onChange={async (e) => {
                      const val = mascaraCep(e.target.value);
                      setForm(prev => ({ ...prev, cep: val }));
                      const raw = val.replace(/\D/g, '');
                      if (raw.length === 8) {
                        try {
                          const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
                          const data = await res.json();
                          if (!data.erro) {
                            setForm(prev => ({ ...prev, logradouro: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', uf: data.uf || '' }));
                          }
                        } catch {}
                      }
                    }}
                    placeholder="00000-000"
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Logradouro</label>
                  <input value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Nº</label>
                  <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Complemento</label>
                  <input value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">UF</label>
                  <select value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value, cidade: "" })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100">
                    <option value="">UF</option>
                    {estadosIBGE.map(est => <option key={est.id} value={est.sigla}>{est.sigla}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Bairro</label>
                  <input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Cidade</label>
                  <input list="cidades-list-modal" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} disabled={!form.uf} placeholder="Pesquise a cidade"
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100 disabled:opacity-50" />
                  <datalist id="cidades-list-modal">
                    {cidadesIBGE.map(cid => <option key={cid.id} value={cid.nome} />)}
                  </datalist>
                </div>
              </div>

              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-4 mb-1">Dados Bancários do Cliente</h3>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1 flex-1 min-w-[140px]">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Banco</label>
                  <input
                    list="bancos-compe-list-modal"
                    value={form.bancoCliente}
                    onChange={e => setForm({ ...form, bancoCliente: e.target.value })}
                    placeholder="Nome ou código COMPE"
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                  <datalist id="bancos-compe-list-modal">
                    {BANCOS_BRASIL.map(b => <option key={b.compe} value={`${b.compe} - ${b.nome}`} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Agência</label>
                  <div className="flex items-center gap-1">
                    <input value={form.agenciaCliente} onChange={e => setForm({ ...form, agenciaCliente: e.target.value })} placeholder="0000"
                      className="w-[72px] rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                    <span className="text-zinc-400 font-bold">-</span>
                    <input value={(form as any).digitoAgenciaCliente || ""} onChange={e => setForm({ ...form, digitoAgenciaCliente: e.target.value } as any)} placeholder="0" maxLength={2}
                      className="w-10 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand/100" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Conta</label>
                  <div className="flex items-center gap-1">
                    <input value={form.contaCliente} onChange={e => setForm({ ...form, contaCliente: e.target.value })} placeholder="00000"
                      className="w-[80px] rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                    <span className="text-zinc-400 font-bold">-</span>
                    <input value={(form as any).digitoContaCliente || ""} onChange={e => setForm({ ...form, digitoContaCliente: e.target.value } as any)} placeholder="0" maxLength={2}
                      className="w-10 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand/100" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Tipo</label>
                  <select value={form.tipoContaCliente} onChange={e => setForm({ ...form, tipoContaCliente: e.target.value })}
                    className="rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100">
                    <option value="">—</option>
                    <option value="CC">Corrente</option>
                    <option value="CP">Poupança</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Detalhes da Operação</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">NB (Benefício)</label>
                  <input value={form.numeroBeneficio} onChange={e => setForm({ ...form, numeroBeneficio: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Espécie INSS</label>
                  <input list="especies-list" value={form.especieBeneficio} onChange={e => setForm({ ...form, especieBeneficio: e.target.value })} placeholder="Pesquise a espécie"
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                  <datalist id="especies-list">
                    {INSS_ESPECIES.map(esp => <option key={esp.id} value={`${esp.id} - ${esp.nome}`} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Livre (R$)</label>
                  <input type="number" step="0.01" value={form.margemLivre} onChange={e => setForm({ ...form, margemLivre: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">RMC (R$)</label>
                  <input type="number" step="0.01" value={form.margemRmc} onChange={e => setForm({ ...form, margemRmc: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">RCC (R$)</label>
                  <input type="number" step="0.01" value={form.margemRcc} onChange={e => setForm({ ...form, margemRcc: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Banco</label>
                  <select value={form.bancoPreferido} onChange={e => setForm({ ...form, bancoPreferido: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100">
                    <option value="">Selecione Banco...</option>
                    {bancos.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Convênio</label>
                  <select value={form.convenioNome} onChange={e => setForm({ ...form, convenioNome: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100">
                    <option value="">Selecione Convênio...</option>
                    {convenios.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Operação</label>
                  <select value={form.tipoOperacao} onChange={e => setForm({ ...form, tipoOperacao: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100">
                    <option value="">—</option>
                    <option value="EMPRESTIMO_CONSIGNADO">Margem Nova</option>
                    <option value="REFINANCIAMENTO">Refinanciamento</option>
                    <option value="PORTABILIDADE">Portabilidade</option>
                    <option value="PORTABILIDADE_REFIN">Port + Refin</option>
                    <option value="CARTAO_CONSIGNADO">Cartão RMC</option>
                    <option value="CARTAO_BENEFICIO">Cartão RCC</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Valor Liberado (R$)</label>
                  <input type="text" value={form.valorLiberado} onChange={e => setForm({ ...form, valorLiberado: formatMoedaInput(e.target.value) })} placeholder="0.00"
                    className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100 font-bold text-emerald-700" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100 resize-none" />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="h-5 w-5 text-brand/100" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Documentos Anexos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
              >
                <UploadCloud className="h-8 w-8 text-zinc-400 mb-2" />
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Clique para anexar arquivos</p>
                <p className="text-xs text-zinc-400 mt-1">PDF, JPG ou PNG (Máx 5MB)</p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,image/jpeg,image/png"
                />
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                {(arquivosPendentes.length === 0 && (!form.arquivosExistem || form.arquivosExistem.length === 0)) ? (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-500 italic">
                    Nenhum documento anexado.
                  </div>
                ) : (
                  <>
                    {form.arquivosExistem && form.arquivosExistem.map((file, i) => (
                      <div key={`saved-${i}`} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate">{file.nome}</p>
                            <p className="text-[10px] text-zinc-500">{file.tamanho ? (file.tamanho / 1024).toFixed(1) + ' KB' : 'Salvo'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => validarDocumento(file.url)}
                            disabled={validandoDoc === file.url}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition flex items-center gap-1 disabled:opacity-50"
                          >
                            {validandoDoc === file.url ? <Loader2 className="w-3 h-3 animate-spin" /> : "✨ Validar"}
                          </button>
                          <a href={file.url} download={file.nome} className="text-xs font-medium text-brand hover:text-violet-700 bg-brand/10 hover:bg-violet-100 px-2 py-1 rounded">
                            Baixar
                          </a>
                        </div>
                      </div>
                    ))}
                    {arquivosPendentes.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate">{file.name}</p>
                            <p className="text-[10px] text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => removerArquivoPendente(i)} className="text-zinc-400 hover:text-red-500 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 shrink-0 mt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              {form.id && onDelete && (perfilUsuario === "admin" || perfilUsuario === "gerente") && (
                <button type="button" onClick={handleDeleteLead} disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition">
                  <Trash2 className="h-4 w-4" /> Excluir Lead
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-brand/100/30 flex items-center gap-2">
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Lead
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
