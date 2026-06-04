"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Users, Plus, X, Loader2, Phone, Mail, DollarSign, GripVertical, Paperclip, Trash2, UploadCloud, FileText, Building2, MessageCircle, MessageSquare, Eye, EyeOff, Search, Filter
} from "lucide-react";
import { toast } from "sonner";
import { InboxDrawer } from "./InboxDrawer";
import { BANCOS_BRASIL, LeadFormModal } from "@/components/LeadFormModal";

type PipelineColuna = { id: string; nome: string; cor: string | null; ordem: number; };

type Lead = {
  id: string; nome: string; cpf: string | null; telefone: string | null;
  email: string | null; uf: string | null; cidade: string | null;
  status: string; origem: string | null; canalContato: string | null;
  numeroBeneficio: string | null; especieBeneficio: number | null;
  margemLivre: number | null; margemRmc: number | null; margemRcc: number | null;
  tipoOperacao: string | null; valorLiberado: number | null;
  bancoPreferido: string | null; convenioNome: string | null; observacoes: string | null;
  vendedorNome: string | null; createdAt: string | Date;
  arquivos?: { id: string; nome: string; url: string; tamanho: number | null }[];
};

type Contagem = { status: string; _count: number };

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova", REFINANCIAMENTO: "Refin",
  PORTABILIDADE: "Port", PORTABILIDADE_REFIN: "Port+Refin",
  CARTAO_CONSIGNADO: "RMC", CARTAO_BENEFICIO: "RCC",
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

const formatMoeda = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "";
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export function LeadsClient({
  leads: leadsIniciais,
  contagens,
  colunas,
  bancos = [],
  convenios = [],
  perfilUsuario,
  abrirNovoModal
}: {
  leads: Lead[];
  contagens: Contagem[];
  colunas: PipelineColuna[];
  bancos?: { id: string, nome: string }[];
  convenios?: { id: string, nome: string }[];
  perfilUsuario?: string;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(leadsIniciais);
  const [modal, setModal] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [lead, setLead] = useState<any>(null);
  const [revelarCpf, setRevelarCpf] = useState(false);
  const [revelarTel, setRevelarTel] = useState(false);
  const [modalColuna, setModalColuna] = useState(false);
  const [colunaNome, setColunaNome] = useState("");
  const [colunaCor, setColunaCor] = useState("#8b5cf6");
  const [inboxDrawerOpen, setInboxDrawerOpen] = useState(false);
  const [integracaoModal, setIntegracaoModal] = useState<{ aberto: boolean, leadId: string, banco: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cpfErro, setCpfErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "", nome: "", cpf: "", telefone: "", email: "", uf: "", cidade: "",
    dataNascimento: "", renda: "", ddb: "",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
    numeroBeneficio: "", especieBeneficio: "", margemLivre: "", margemRmc: "", margemRcc: "",
    tipoOperacao: "", valorLiberado: "", bancoPreferido: "", convenioNome: "",
    bancoCliente: "", agenciaCliente: "", digitoAgenciaCliente: "", contaCliente: "", digitoContaCliente: "", tipoContaCliente: "",
    origem: "manual", canalContato: "", observacoes: "",
    arquivosExistem: [] as any[],
  });

  const [novaColunaNome, setNovaColunaNome] = useState("");

  // AI States
  const [tabModal, setTabModal] = useState<"dados" | "refin" | "inss">("dados");
  const [textoHiscon, setTextoHiscon] = useState("");
  const [analisandoHiscon, setAnalisandoHiscon] = useState(false);
  const [resultadoRefin, setResultadoRefin] = useState<any>(null);
  const [validandoDoc, setValidandoDoc] = useState<string | null>(null);

  // Banco Cliente search
  const [bancoClienteQuery, setBancoClienteQuery] = useState("");
  const [showBancoDropdown, setShowBancoDropdown] = useState(false);

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

  // Funções de Máscara
  const formatCPF = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return v;
  };

  const formatTelefone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    }
    return v;
  };

  const formatMoedaInput = (v: string) => {
    v = v.replace(/\D/g, "");
    const num = (Number(v) / 100).toFixed(2);
    return num;
  };

  // IBGE States
  const [estadosIBGE, setEstadosIBGE] = useState<any[]>([]);
  const [cidadesIBGE, setCidadesIBGE] = useState<any[]>([]);

  // Files State
  const [arquivosPendentes, setArquivosPendentes] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroProduto, setFiltroProduto] = useState("todos");
  const [filtroConvenio, setFiltroConvenio] = useState("todos");

  const leadsFiltrados = leads.filter(l => {
    // 1. Busca textual
    if (busca) {
      const termo = busca.toLowerCase();
      if (!l.nome?.toLowerCase().includes(termo) && 
          !l.cpf?.includes(termo) && 
          !l.telefone?.includes(termo) && 
          !l.email?.toLowerCase().includes(termo)) {
        return false;
      }
    }

    // 2. Filtro Produto
    if (filtroProduto !== "todos" && l.tipoOperacao !== filtroProduto) return false;

    // 3. Filtro Convênio
    if (filtroConvenio !== "todos" && l.convenioNome !== filtroConvenio) return false;

    // 4. Filtro Período
    if (filtroPeriodo !== "todos" && l.createdAt) {
      const dataCriacao = new Date(l.createdAt);
      const hoje = new Date();
      const diffTime = Math.abs(hoje.getTime() - dataCriacao.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filtroPeriodo === "7d" && diffDays > 7) return false;
      if (filtroPeriodo === "30d" && diffDays > 30) return false;
      if (filtroPeriodo === "90d" && diffDays > 90) return false;
    }

    return true;
  });

  const totalAtivos = leadsFiltrados.length;

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
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('novo') === 'true') {
        abrirModalNovo();
        url.searchParams.delete('novo');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const abrirModalNovo = () => {
    setForm({
      id: "", nome: "", cpf: "", telefone: "", email: "", uf: "", cidade: "",
      dataNascimento: "", renda: "", ddb: "",
      cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
      numeroBeneficio: "", especieBeneficio: "", margemLivre: "", margemRmc: "", margemRcc: "",
      tipoOperacao: "", valorLiberado: "", bancoPreferido: "", convenioNome: "",
      bancoCliente: "", agenciaCliente: "", contaCliente: "", tipoContaCliente: "",
      origem: "manual", canalContato: "", observacoes: "", arquivosExistem: []
    });
    setArquivosPendentes([]);
    setCpfErro(null);
    setErro(null);
    setModal(true);
  };

  const abrirModalEditar = (lead: Lead) => {
    const l = lead as any;
    setForm({
      id: lead.id,
      nome: lead.nome,
      cpf: lead.cpf ? mascaraCpf(lead.cpf) : "",
      telefone: lead.telefone ? mascaraTelefone(lead.telefone) : "",
      email: lead.email || "",
      uf: lead.uf || "",
      cidade: lead.cidade || "",
      dataNascimento: l.dataNascimento ? new Date(l.dataNascimento).toISOString().split('T')[0] : "",
      renda: l.renda ? l.renda.toString() : "",
      ddb: l.ddb ? new Date(l.ddb).toISOString().split('T')[0] : "",
      cep: l.cep || "",
      logradouro: l.logradouro || "",
      numero: l.numero || "",
      complemento: l.complemento || "",
      bairro: l.bairro || "",
      numeroBeneficio: lead.numeroBeneficio || "",
      especieBeneficio: lead.especieBeneficio ? lead.especieBeneficio.toString() : "",
      margemLivre: lead.margemLivre ? lead.margemLivre.toString() : "",
      margemRmc: lead.margemRmc ? lead.margemRmc.toString() : "",
      margemRcc: lead.margemRcc ? lead.margemRcc.toString() : "",
      tipoOperacao: lead.tipoOperacao || "",
      valorLiberado: lead.valorLiberado ? lead.valorLiberado.toString() : "",
      bancoPreferido: lead.bancoPreferido || "",
      convenioNome: lead.convenioNome || "",
      bancoCliente: l.bancoCliente || "",
      agenciaCliente: l.agenciaCliente || "",
      contaCliente: l.contaCliente || "",
      tipoContaCliente: l.tipoContaCliente || "",
      origem: lead.origem || "manual",
      canalContato: lead.canalContato || "",
      observacoes: lead.observacoes || "",
      arquivosExistem: lead.arquivos || [],
    });
    setArquivosPendentes([]);
    setCpfErro(null);
    setErro(null);
    setModal(true);
  };

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
    delete payload.arquivosExistem; // Remove auxiliary property before sending

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

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(formataErroZod(data.error)); setSalvando(false); return;
    }

    toast.success(isEdit ? "Lead atualizado com sucesso!" : "Lead criado com sucesso!");

    setModal(false);
    setSalvando(false);
    router.refresh();
    setTimeout(() => window.location.reload(), 500);
  }

  async function deletarLead(id: string) {
    if (!confirm("Tem certeza que deseja excluir permanentemente este lead?")) return;

    setSalvando(true);
    setErro(null);

    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErro(data.error || "Erro ao excluir lead");
      setSalvando(false);
      return;
    }

    toast.success("Lead excluído com sucesso!");
    setModal(false);
    setSalvando(false);
    router.refresh();
    setTimeout(() => window.location.reload(), 500);
  }

  async function criarColuna(e: React.FormEvent) {
    e.preventDefault();
    if (!novaColunaNome) return;
    setSalvando(true);

    await fetch("/api/leads/pipeline-colunas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novaColunaNome, cor: "bg-zinc-500" }),
    });

    setModalColuna(false);
    setSalvando(false);
    setNovaColunaNome("");
    router.refresh();
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId;
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, status: newStatus } : l));

    await fetch(`/api/leads/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (newStatus.toUpperCase() === "VENDIDO" || newStatus.toUpperCase() === "GANHO") {
      const lead = leads.find(l => l.id === draggableId);
      if (lead?.bancoPreferido) {
        setIntegracaoModal({ aberto: true, leadId: draggableId, banco: lead.bancoPreferido });
      } else {
        toast.info("Lead movido para VENDIDO. Atribua um banco para gerar a proposta na Esteira.");
      }
    }

    if (newStatus === "PAGO" || newStatus === "Pago") {
      try { await fetch(`/api/leads/${draggableId}/comissao`, { method: "POST" }); } catch (e) { }
    }

    router.refresh();
  };

  async function handleIntegracaoConfirm(integrar: boolean) {
    if (!integracaoModal) return;
    setSalvando(true);

    try {
      const res = await fetch("/api/propostas/integrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: integracaoModal.leadId })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao processar integração.");
      } else {
        if (data.integrada) {
          toast.success(`Proposta criada na Esteira e ENVIADA com sucesso para o banco ${integracaoModal.banco}!`);
        } else {
          toast.success(`Proposta criada na Esteira para o banco ${integracaoModal.banco}.`);
        }
      }
    } catch (e) {
      toast.error("Erro de conexão ao integrar proposta.");
    } finally {
      setSalvando(false);
      setIntegracaoModal(null);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Users className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">CRM Kanban</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Pipeline de Leads</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {totalAtivos} lead{totalAtivos !== 1 ? "s" : ""} {busca ? "encontrados" : "no funil"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand cursor-pointer">
              <option value="todos">Qualquer Período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
            <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand cursor-pointer max-w-[160px] truncate">
              <option value="todos">Todos Produtos</option>
              {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filtroConvenio} onChange={e => setFiltroConvenio(e.target.value)} className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand cursor-pointer max-w-[160px] truncate">
              <option value="todos">Todos Convênios</option>
              {convenios?.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input 
                type="text"
                placeholder="Buscar lead..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 pr-8 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-brand outline-none w-48 transition-all"
              />
              {busca && (
                <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                </button>
              )}
            </div>
            <button onClick={abrirModalNovo}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/100/25 hover:opacity-95 transition">
              <Plus className="h-4 w-4" /> Novo Lead
            </button>
          </div>
        </header>

        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[60vh]">
          <DragDropContext onDragEnd={onDragEnd}>
            {colunas.map((coluna) => {
              const items = leadsFiltrados.filter(l => (l.status || "NOVO").trim().toUpperCase() === coluna.nome.trim().toUpperCase());
              return (
                <div key={coluna.id} className="flex-shrink-0 w-80 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-3 flex flex-col max-h-[80vh]">
                  <div className="flex items-center justify-between px-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${coluna.cor || 'bg-zinc-400'}`} />
                      <h3 className="font-semibold text-sm">{coluna.nome}</h3>
                    </div>
                    <span className="text-xs font-bold text-zinc-500 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-sm">
                      {items.length}
                    </span>
                  </div>

                  <Droppable droppableId={coluna.nome}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto space-y-3 p-1 transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-brand/10 dark:bg-brand/20' : ''}`}>
                        {items.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => abrirModalEditar(lead)}
                                className={`bg-white dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3 transition-shadow cursor-pointer ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand/50 opacity-90' : 'hover:shadow-md'}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">{lead.nome}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(lead as any).score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          (lead as any).score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                        Score: {(lead as any).score || 0}
                                      </span>
                                      {(lead as any).score >= 80 && (
                                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-bold">
                                          🔥 Quente
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />
                                </div>
                                <div className="flex flex-col gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                  {lead.telefone && (
                                    <div className="flex items-center justify-between gap-2 group/btn">
                                      <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{mascaraTelefone(lead.telefone)}</span>
                                      <a
                                        href={getWhatsAppLink(lead.telefone, "")} target="_blank" rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="opacity-0 group-hover/btn:opacity-100 flex items-center gap-1 bg-[#25D366] text-white px-2 py-0.5 rounded text-[10px] font-bold transition hover:bg-[#1DA851]"
                                      >
                                        <MessageCircle className="w-3 h-3" /> Chamar
                                      </a>
                                    </div>
                                  )}
                                  {lead.email && <span className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{lead.email}</span></span>}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    {lead.valorLiberado ? (<><DollarSign className="h-3.5 w-3.5" />{formatMoeda(lead.valorLiberado)}</>) : (<span className="text-zinc-400 font-normal">Sem valor</span>)}
                                  </div>
                                  {lead.tipoOperacao && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-[100px]">{tipoLabel[lead.tipoOperacao] || lead.tipoOperacao}</span>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
            
            {/* Colunas Dinâmicas para Status Desconhecidos (Fantasmas/Antigos) */}
            {Array.from(new Set(leadsFiltrados.map(l => (l.status || "NOVO").trim().toUpperCase())))
              .filter(status => !colunas.some(c => c.nome.trim().toUpperCase() === status))
              .map((statusExtra) => {
                const items = leadsFiltrados.filter(l => (l.status || "NOVO").trim().toUpperCase() === statusExtra);
                return (
                  <div key={statusExtra} className="flex-shrink-0 w-80 bg-red-50 dark:bg-red-950/20 rounded-2xl p-3 flex flex-col max-h-[80vh] border border-red-200 dark:border-red-900/30">
                    <div className="flex items-center justify-between px-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">{statusExtra} <span className="text-[10px] font-normal">(Órfãos)</span></h3>
                      </div>
                      <span className="text-xs font-bold text-red-500 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-sm">
                        {items.length}
                      </span>
                    </div>

                    <Droppable droppableId={statusExtra}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto space-y-3 p-1 transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-red-500/10' : ''}`}>
                          {items.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => abrirModalEditar(lead)}
                                  className={`bg-white dark:bg-zinc-950 rounded-xl p-4 border border-red-100 dark:border-red-900/50 shadow-sm flex flex-col gap-3 transition-shadow cursor-pointer ${snapshot.isDragging ? 'shadow-xl ring-2 ring-red-500/50 opacity-90' : 'hover:shadow-md'}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">{lead.nome}</p>
                                    </div>
                                    <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />
                                  </div>
                                  <div className="flex flex-col gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    {lead.telefone && (
                                      <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{mascaraTelefone(lead.telefone)}</div>
                                    )}
                                    {lead.email && <span className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{lead.email}</span></span>}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
            })}


            <div className="flex-shrink-0 w-80 bg-transparent border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center opacity-70 hover:opacity-100 hover:border-brand/40 transition-all cursor-pointer h-32" onClick={() => setModalColuna(true)}>
              <Plus className="h-6 w-6 text-zinc-400 mb-2" />
              <p className="text-sm font-medium text-zinc-500">Adicionar Coluna</p>
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Modal de criação/edição — usa LeadFormModal compartilhado */}
      <LeadFormModal
        open={modal}
        onClose={() => setModal(false)}
        leadSelecionado={form.id ? leads.find(l => l.id === form.id) || null : null}
        onSuccess={() => { setModal(false); carregarLeads(); }}
        onDelete={() => { setModal(false); carregarLeads(); }}
      />

          {modalColuna && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-sm mx-4">
                <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold">Nova Coluna</h2>
                  <button onClick={() => setModalColuna(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={criarColuna} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Coluna *</label>
                    <input required value={novaColunaNome} onChange={e => setNovaColunaNome(e.target.value)} placeholder="Ex: CONTRATO ASSINADO"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100 uppercase" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setModalColuna(false)} className="px-4 py-2 text-sm text-zinc-600">Cancelar</button>
                    <button type="submit" disabled={salvando}
                      className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
                      {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {salvando ? "Criando..." : "Criar Coluna"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Integração Automática */}
          {integracaoModal?.aberto && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Integração Bancária</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                    Este Lead foi movido para VENDIDO. Deseja enviar a proposta automaticamente via API/Robô para o <strong>{integracaoModal.banco}</strong>?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleIntegracaoConfirm(true)}
                      disabled={salvando}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold shadow-lg shadow-emerald-500/30 hover:opacity-90 transition disabled:opacity-50"
                    >
                      {salvando ? "Processando..." : `Sim, enviar para o ${integracaoModal.banco}`}
                    </button>
                    <button
                      onClick={() => handleIntegracaoConfirm(false)}
                      disabled={salvando}
                      className="w-full py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50"
                    >
                      {salvando ? "Processando..." : "Não, apenas registrar na Esteira Interna"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Drawer Omnichannel */}
          <InboxDrawer
            isOpen={inboxDrawerOpen}
            onClose={() => setInboxDrawerOpen(false)}
            lead={form}
            sessao={{ perfilSlug: perfilUsuario }}
          />
        </div>
      );
}
