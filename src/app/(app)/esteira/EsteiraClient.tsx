"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Kanban,
  Plus,
  X,
  Loader2,
  User,
  Phone,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  Filter,
  GripVertical,
  Building2,
  FileText,
  List,
  Pencil,
  Trash2,
  Save
} from "lucide-react";
import { toast } from "sonner";

type Proposta = {
  id: string;
  clienteNome: string;
  clienteCpf: string | null;
  clienteTelefone: string | null;
  tipoOperacao: string | null;
  status: string;
  bancoNome: string | null;
  produtoNome: string | null;
  convenioNome: string | null;
  vendedorNome: string | null;
  valorParcela: number | null;
  valorLiberado: number | null;
  prazo: number | null;
  taxaJuros: number | null;
  observacoes: string | null;
  createdAt: string | Date;
};

type Contagem = {
  status: string;
  _count: number;
  _sum: { valorLiberado: number | null };
};

const statusConfig: Record<string, { label: string; color: string; bgCard: string }> = {
  RASCUNHO: { label: "Rascunho", color: "bg-zinc-400", bgCard: "border-zinc-300 dark:border-zinc-700" },
  SIMULADA: { label: "Simulada", color: "bg-sky-500", bgCard: "border-sky-300 dark:border-sky-800" },
  DIGITADA: { label: "Digitada", color: "bg-amber-500", bgCard: "border-amber-300 dark:border-amber-800" },
  PENDENTE: { label: "Pendente", color: "bg-orange-500", bgCard: "border-orange-300 dark:border-orange-800" },
  APROVADA: { label: "Aprovada", color: "bg-emerald-500", bgCard: "border-emerald-300 dark:border-emerald-800" },
  REPROVADA: { label: "Reprovada", color: "bg-red-500", bgCard: "border-red-300 dark:border-red-800" },
  PAGA: { label: "Paga", color: "bg-brand", bgCard: "border-brand/40 dark:border-brand/60" },
  CANCELADA: { label: "Cancelada", color: "bg-zinc-500", bgCard: "border-zinc-400 dark:border-zinc-600" },
};

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova",
  REFINANCIAMENTO: "Refin",
  PORTABILIDADE: "Port",
  PORTABILIDADE_REFIN: "Port+Refin",
  CARTAO_CONSIGNADO: "Cartão RMC",
  CARTAO_BENEFICIO: "Cartão RCC",
};

const funnelOrder = ["RASCUNHO", "SIMULADA", "DIGITADA", "PENDENTE", "APROVADA", "PAGA"];

export function EsteiraClient({
  propostas: propostasIniciais,
  contagens,
  tiposOperacao = [],
  convenios = [],
}: {
  propostas: Proposta[];
  contagens: Contagem[];
  tiposOperacao?: string[];
  convenios?: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [propostas, setPropostas] = useState(propostasIniciais);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroConvenio, setFiltroConvenio] = useState("");
  const [busca, setBusca] = useState("");
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [porPagina, setPorPagina] = useState(10);
  const [paginaLista, setPaginaLista] = useState(1);
  const [form, setForm] = useState({
    clienteNome: "", clienteCpf: "", clienteTelefone: "", email: "",
    uf: "", cidade: "", numeroBeneficio: "", especieBeneficio: "",
    margemLivre: "", margemRmc: "", margemRcc: "",
    tipoOperacao: "Saque FGTS", bancoNome: "", convenioNome: "",
    valorLiberado: "", valorParcela: "", prazo: "", taxaJuros: "",
    codigoPropostaBanco: "", promotora: "", tabela: "",
    bancoOrigem: "", saldoDevedor: "",
    vendedorNome: "", dataDigitacao: "", observacoes: "",
  });
  const emptyForm = { ...form };
  const [formTab, setFormTab] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchPropostas, setSearchPropostas] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useState<any>(null);

  // Estado do modal de edição
  const [editModal, setEditModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [editForm, setEditForm] = useState<{
    id: string; clienteNome: string; clienteCpf: string; clienteTelefone: string;
    tipoOperacao: string; bancoNome: string; valorLiberado: string; valorParcela: string;
    prazo: string; taxaJuros: string; observacoes: string; convenioNome: string;
    bancoOrigem: string; saldoDevedor: string;
  }>({
    id: "", clienteNome: "", clienteCpf: "", clienteTelefone: "",
    tipoOperacao: "", bancoNome: "", valorLiberado: "", valorParcela: "",
    prazo: "", taxaJuros: "", observacoes: "", convenioNome: "",
    bancoOrigem: "", saldoDevedor: "",
  });

  function abrirEditModal(p: Proposta) {
    setEditForm({
      id: p.id,
      clienteNome: p.clienteNome || "",
      clienteCpf: p.clienteCpf || "",
      clienteTelefone: p.clienteTelefone || "",
      tipoOperacao: p.tipoOperacao || "",
      bancoNome: p.bancoNome || "",
      valorLiberado: p.valorLiberado?.toString() || "",
      valorParcela: p.valorParcela?.toString() || "",
      prazo: p.prazo?.toString() || "",
      taxaJuros: p.taxaJuros?.toString() || "",
      observacoes: p.observacoes || "",
      convenioNome: p.convenioNome || "",
      bancoOrigem: "",
      saldoDevedor: "",
    });
    setEditModal(true);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    setEditando(true);
    try {
      const payload: any = { clienteNome: editForm.clienteNome };
      if (editForm.clienteCpf) payload.clienteCpf = editForm.clienteCpf;
      if (editForm.clienteTelefone) payload.clienteTelefone = editForm.clienteTelefone;
      if (editForm.tipoOperacao) payload.tipoOperacao = editForm.tipoOperacao;
      if (editForm.bancoNome) payload.bancoNome = editForm.bancoNome;
      if (editForm.convenioNome) payload.convenioNome = editForm.convenioNome;
      if (editForm.valorLiberado) payload.valorLiberado = Number(editForm.valorLiberado);
      if (editForm.valorParcela) payload.valorParcela = Number(editForm.valorParcela);
      if (editForm.prazo) payload.prazo = Number(editForm.prazo);
      if (editForm.taxaJuros) payload.taxaJuros = Number(editForm.taxaJuros);
      if (editForm.bancoOrigem) payload.bancoOrigem = editForm.bancoOrigem;
      if (editForm.saldoDevedor) payload.saldoDevedor = Number(editForm.saldoDevedor);
      payload.observacoes = editForm.observacoes || null;

      const res = await fetch(`/api/propostas/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro");
      toast.success("Proposta atualizada!");
      setEditModal(false);
      router.refresh();
    } catch { toast.error("Erro ao salvar."); }
    setEditando(false);
  }

  async function excluirProposta() {
    if (!confirm(`Excluir proposta de ${editForm.clienteNome}? Esta ação será registrada no log.`)) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/propostas/${editForm.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
      setPropostas(prev => prev.filter(p => p.id !== editForm.id));
      toast.success("Proposta excluída.");
      setEditModal(false);
      router.refresh();
    } catch { toast.error("Erro ao excluir."); }
    setExcluindo(false);
  }

  const filtrados = propostas.filter((p) => {
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (filtroTipo && (p.tipoOperacao || "") !== filtroTipo) return false;
    if (filtroConvenio && (p.convenioNome || "") !== filtroConvenio) return false;
    if (busca && !p.clienteNome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroPeriodo) {
      const d = new Date(p.createdAt);
      const now = new Date();
      const dias = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (filtroPeriodo === "7d" && dias > 7) return false;
      if (filtroPeriodo === "30d" && dias > 30) return false;
      if (filtroPeriodo === "90d" && dias > 90) return false;
      if (filtroPeriodo === "ano" && d.getFullYear() !== now.getFullYear()) return false;
    }
    return true;
  });

  // Funil KPIs
  const funnelData = funnelOrder.map((s) => {
    const c = contagens.find((x) => x.status === s);
    return {
      status: s,
      label: statusConfig[s]?.label || s,
      count: c?._count || 0,
      valor: c?._sum?.valorLiberado || 0,
      color: statusConfig[s]?.color || "bg-zinc-400",
    };
  });
  const maxFunnel = Math.max(...funnelData.map((f) => f.count), 1);

  async function searchCliente(q: string) {
    if (q.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/leads/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.leads || []);
      setSearchPropostas(data.propostas || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }

  function selecionarLead(lead: any) {
    setForm(f => ({
      ...f,
      clienteNome: lead.nome || "",
      clienteCpf: lead.cpf || "",
      clienteTelefone: lead.telefone || "",
      email: lead.email || "",
      uf: lead.uf || "",
      cidade: lead.cidade || "",
      numeroBeneficio: lead.numeroBeneficio || "",
      especieBeneficio: lead.especieBeneficio?.toString() || "",
      margemLivre: lead.margemLivre?.toString() || "",
      margemRmc: lead.margemRmc?.toString() || "",
      margemRcc: lead.margemRcc?.toString() || "",
      tipoOperacao: lead.tipoOperacao || "Saque FGTS",
      bancoNome: lead.bancoPreferido || "",
      convenioNome: lead.convenioNome || "",
      valorLiberado: lead.valorLiberado?.toString() || "",
      vendedorNome: lead.vendedorNome || "",
    }));
    setSelectedLead(lead);
    setSearchResults([]);
  }

  async function criarProposta(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const payload: any = {
      clienteNome: form.clienteNome,
      tipoOperacao: form.tipoOperacao || undefined,
    };
    if (form.clienteCpf) payload.clienteCpf = form.clienteCpf;
    if (form.clienteTelefone) payload.clienteTelefone = form.clienteTelefone;
    if (form.numeroBeneficio) payload.numeroBeneficio = form.numeroBeneficio;
    if (form.especieBeneficio) payload.especieBeneficio = Number(form.especieBeneficio);
    if (form.bancoNome) payload.bancoNome = form.bancoNome;
    if (form.convenioNome) payload.convenioNome = form.convenioNome;
    if (form.valorLiberado) payload.valorLiberado = Number(form.valorLiberado);
    if (form.valorParcela) payload.valorParcela = Number(form.valorParcela);
    if (form.prazo) payload.prazo = Number(form.prazo);
    if (form.taxaJuros) payload.taxaJuros = Number(form.taxaJuros);
    if (form.codigoPropostaBanco) payload.codigoPropostaBanco = form.codigoPropostaBanco;
    if (form.bancoOrigem) payload.bancoOrigem = form.bancoOrigem;
    if (form.saldoDevedor) payload.saldoDevedor = Number(form.saldoDevedor);
    if (form.vendedorNome) payload.vendedorNome = form.vendedorNome;
    if (selectedLead) payload.leadId = selectedLead.id;
    payload.observacoes = form.observacoes || undefined;

    const res = await fetch("/api/propostas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) { setErro(data.error); setSalvando(false); return; }

    setModal(false);
    setSalvando(false);
    setForm(emptyForm);
    setFormTab(0);
    setSelectedLead(null);
    setSearchResults([]);
    setSearchPropostas([]);
    router.refresh();
  }

  async function mudarStatus(propostaId: string, novoStatus: string) {
    setAtualizando(propostaId);
    try {
      const res = await fetch(`/api/propostas/${propostaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      toast.success(`Status atualizado para ${statusConfig[novoStatus]?.label}`);
    } catch (err) {
      toast.error("Não foi possível atualizar o status bancário.");
    } finally {
      setAtualizando(null);
      router.refresh();
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const novoStatus = destination.droppableId;
    await mudarStatus(draggableId, novoStatus);
  };

  function formatMoney(v: number | null) {
    if (!v) return "—";
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Kanban className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Esteira de Propostas</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Propostas</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {propostas.length} proposta{propostas.length !== 1 ? "s" : ""} {busca ? "encontradas" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {filtroStatus && (
              <button
                onClick={() => setFiltroStatus("")}
                className="flex items-center gap-1 text-xs font-semibold text-brand border border-brand/20 bg-brand/5 rounded-xl px-3 py-2.5 hover:bg-brand/10 transition"
              >
                <Filter className="h-3.5 w-3.5" />
                {statusConfig[filtroStatus]?.label}
                <X className="h-3 w-3" />
              </button>
            )}
            <select value={filtroPeriodo} onChange={(e) => { setFiltroPeriodo(e.target.value); setPaginaLista(1); }} className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand cursor-pointer">
              <option value="">Qualquer Período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="ano">Este ano</option>
            </select>
            <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPaginaLista(1); }} className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand cursor-pointer max-w-[160px] truncate">
              <option value="">Todos Produtos</option>
              {tiposOperacao.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filtroConvenio} onChange={(e) => { setFiltroConvenio(e.target.value); setPaginaLista(1); }} className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand cursor-pointer max-w-[160px] truncate">
              <option value="">Todos Convênios</option>
              {convenios?.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input 
                type="text"
                placeholder="Buscar proposta..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPaginaLista(1); }}
                className="pl-9 pr-8 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-brand outline-none w-48 transition-all"
              />
              {busca && (
                <button onClick={() => { setBusca(""); setPaginaLista(1); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                </button>
              )}
            </div>
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 transition"
            >
              <Plus className="h-4 w-4" /> Nova Proposta
            </button>
          </div>
        </header>

        {/* Funil */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {funnelData.map((f) => (
            <button
              key={f.status}
              onClick={() => setFiltroStatus(filtroStatus === f.status ? "" : f.status)}
              className={`rounded-xl border p-4 text-left transition hover:shadow-md ${
                filtroStatus === f.status
                  ? "border-brand dark:border-brand/60 bg-brand/10 dark:bg-brand/30"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2.5 w-2.5 rounded-full ${f.color}`} />
                <span className="text-xs text-zinc-500 font-medium">{f.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{f.count}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{formatMoney(f.valor)}</p>
              {/* Mini bar */}
              <div className="mt-2 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${f.color} transition-all`}
                  style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>


        {/* Pipeline Kanban */}
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[60vh] scrollbar-hide">
          <DragDropContext onDragEnd={onDragEnd}>
            {funnelOrder.map((statusKey) => {
              const cfg = statusConfig[statusKey] || statusConfig.RASCUNHO;
              const items = filtrados.filter(p => p.status === statusKey);
              const totalValor = items.reduce((acc, curr) => acc + (curr.valorLiberado || 0), 0);

              return (
                <div key={statusKey} className="flex-shrink-0 w-80 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-3 flex flex-col max-h-[80vh]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${cfg.color}`} />
                      <h3 className="font-semibold text-sm">{cfg.label}</h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-zinc-500 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-sm">
                        {items.length}
                      </span>
                      <span className="text-[9px] text-zinc-400 mt-1 font-medium">{formatMoney(totalValor)}</span>
                    </div>
                  </div>

                  <Droppable droppableId={statusKey}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps} 
                        className={`flex-1 overflow-y-auto space-y-3 p-1 transition-colors rounded-xl min-h-[150px] ${snapshot.isDraggingOver ? 'bg-brand/10 dark:bg-brand/20' : ''}`}
                      >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <div className="py-10 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl opacity-40">
                             <p className="text-[10px] uppercase font-bold tracking-tighter text-zinc-400">Vazio</p>
                          </div>
                        )}

                        {items.map((p, index) => (
                          <Draggable key={p.id} draggableId={p.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                {...provided.dragHandleProps}
                                className={`bg-white dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3 transition-shadow cursor-pointer ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand/50 opacity-90' : 'hover:shadow-md'}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); abrirEditModal(p); }}>
                                    <p className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">{p.clienteNome}</p>
                                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{p.tipoOperacao ? (tipoLabel[p.tipoOperacao] || p.tipoOperacao) : "—"}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); abrirEditModal(p); }} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" title="Editar">
                                      <Pencil className="h-3.5 w-3.5 text-zinc-400 hover:text-sky-500"/>
                                    </button>
                                    <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                  {p.bancoNome && (
                                    <div className="flex items-center gap-1.5">
                                      <Building2 className="h-3 w-3 shrink-0" />
                                      <span className="truncate font-medium">{p.bancoNome}</span>
                                    </div>
                                  )}
                                  {p.clienteTelefone && (
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="h-3 w-3 shrink-0" />
                                      <span>{p.clienteTelefone}</span>
                                    </div>
                                  )}
                                </div>

                                {['RASCUNHO', 'SIMULADA'].includes(p.status) && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if(!p.bancoNome) return alert("Defina um banco na proposta antes de enviá-la para o robô.");
                                      const btn = e.currentTarget;
                                      const originalText = btn.innerHTML;
                                      btn.innerHTML = "Enviando...";
                                      try {
                                        const res = await fetch('/api/rpa/digitar', {
                                          method: 'POST',
                                          headers: {'Content-Type': 'application/json'},
                                          body: JSON.stringify({ propostaId: p.id, banco: p.bancoNome })
                                        });
                                        if(res.ok) {
                                          alert("Sucesso! Tarefa enfileirada no Robô RPA. O status mudará automaticamente quando a digitação for concluída.");
                                        } else {
                                          throw new Error("API Falhou");
                                        }
                                      } catch(err) {
                                        alert("Erro ao conectar com a fila RPA.");
                                      } finally {
                                        btn.innerHTML = originalText;
                                      }
                                    }}
                                    className="mt-1 w-full flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 16 4-4-4-4"/><path d="M8 12h8"/></svg>
                                    Digitação Automática
                                  </button>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatMoney(p.valorLiberado)}
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-zinc-400 uppercase tracking-tighter">
                                    <Clock className="h-3 w-3" />
                                    {new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                  </div>
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
          </DragDropContext>
        </div>

        {/* Lista Sequencial */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><List className="h-5 w-5 text-brand"/>Lista de Propostas</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Exibir:</span>
                {[5,10,20,50,100].map(n => (
                  <button key={n} onClick={() => { setPorPagina(n); setPaginaLista(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${porPagina===n ? "bg-brand text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-zinc-400">{filtrados.length} total</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-zinc-50 dark:bg-zinc-800/40">
                <th className="text-left px-3 py-2 font-medium text-zinc-500">#</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Nome</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">CPF</th>
                <th className="text-center px-3 py-2 font-medium text-zinc-500">Data</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Banco</th>
                <th className="text-center px-3 py-2 font-medium text-zinc-500">Tipo</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Convênio</th>
                <th className="text-right px-3 py-2 font-medium text-zinc-500">Parcela</th>
                <th className="text-right px-3 py-2 font-medium text-zinc-500">Liberado</th>
                <th className="text-center px-3 py-2 font-medium text-zinc-500">Status</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Vendedor</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Telefone</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtrados.slice((paginaLista-1)*porPagina, paginaLista*porPagina).map((p, idx) => {
                  const sc: Record<string,string> = {
                    PAGA:"bg-emerald-100 text-emerald-700", APROVADA:"bg-green-100 text-green-700",
                    DIGITADA:"bg-sky-100 text-sky-700", PENDENTE:"bg-amber-100 text-amber-700",
                    SIMULADA:"bg-blue-100 text-blue-700", RASCUNHO:"bg-zinc-100 text-zinc-600",
                    REPROVADA:"bg-red-100 text-red-700", CANCELADA:"bg-zinc-100 text-zinc-400",
                  };
                  const tl: Record<string,string> = {
                    PORTABILIDADE:"Port", PORTABILIDADE_REFIN:"P+R",
                    REFINANCIAMENTO:"Refin", EMPRESTIMO_CONSIGNADO:"Novo",
                    CARTAO_CONSIGNADO:"Cartão", CARTAO_BENEFICIO:"Benefício",
                  };
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer" onClick={() => router.push(`/esteira?proposta=${p.id}`)}>
                      <td className="px-3 py-2 text-zinc-400 tabular-nums">{(paginaLista-1)*porPagina+idx+1}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap max-w-[180px] truncate">{p.clienteNome}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-500 whitespace-nowrap">{p.clienteCpf || "—"}</td>
                      <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{p.bancoNome || "—"}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        p.tipoOperacao==="PORTABILIDADE"?"bg-sky-100 text-sky-700":
                        p.tipoOperacao==="PORTABILIDADE_REFIN"?"bg-violet-100 text-violet-700":
                        p.tipoOperacao==="REFINANCIAMENTO"?"bg-amber-100 text-amber-700":
                        p.tipoOperacao==="EMPRESTIMO_CONSIGNADO"?"bg-emerald-100 text-emerald-700":
                        "bg-zinc-100 text-zinc-700"
                      }`}>{p.tipoOperacao ? (tl[p.tipoOperacao] || p.tipoOperacao.substring(0,6)) : "—"}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.convenioNome || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.valorParcela ? `R$ ${p.valorParcela.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-600">{p.valorLiberado ? `R$ ${p.valorLiberado.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${sc[p.status] || "bg-zinc-100 text-zinc-600"}`}>{statusConfig[p.status]?.label || p.status}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.vendedorNome || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{p.clienteTelefone || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtrados.length > porPagina && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setPaginaLista(p => Math.max(1, p-1))} disabled={paginaLista===1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition disabled:opacity-30">
                ← Anterior
              </button>
              <span className="text-xs text-zinc-500 tabular-nums">
                Página {paginaLista} de {Math.ceil(filtrados.length / porPagina)} · {(paginaLista-1)*porPagina+1}–{Math.min(paginaLista*porPagina, filtrados.length)} de {filtrados.length}
              </span>
              <button onClick={() => setPaginaLista(p => Math.min(Math.ceil(filtrados.length / porPagina), p+1))} disabled={paginaLista >= Math.ceil(filtrados.length / porPagina)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition disabled:opacity-30">
                Próxima →
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modal Nova Proposta — Formulário Completo */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="h-5 w-5 text-brand"/>Nova Proposta</h2>
              <button onClick={() => { setModal(false); setFormTab(0); setSelectedLead(null); setSearchResults([]); }} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6">
              {["👤 Cliente","📋 Operação","💰 Financeiro"].map((t, i) => (
                <button key={i} onClick={() => setFormTab(i)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition ${formTab === i ? "border-brand text-brand" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>{t}</button>
              ))}
            </div>

            {/* Selected Lead Badge */}
            {selectedLead && (
              <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand/10 border border-brand/20">
                <CheckCircle2 className="h-4 w-4 text-brand"/>
                <span className="text-xs font-semibold text-brand">Cliente existente: {selectedLead.nome}</span>
                <button onClick={() => { setSelectedLead(null); setForm(emptyForm); }} className="ml-auto text-xs text-zinc-400 hover:text-red-500">✕ Limpar</button>
              </div>
            )}

            <form onSubmit={criarProposta} className="p-6 space-y-4">
              {erro && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{erro}</div>
              )}

              {/* TAB 0: Cliente */}
              {formTab === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">Nome do Cliente *</label>
                    <input required value={form.clienteNome} onChange={(e) => { setForm({ ...form, clienteNome: e.target.value }); searchCliente(e.target.value); }} placeholder="Digite para buscar cliente existente..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    {searching && <p className="text-xs text-zinc-400 mt-1">Buscando...</p>}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {searchResults.map((l: any) => (
                          <button type="button" key={l.id} onClick={() => selecionarLead(l)}
                            className="w-full px-4 py-3 text-left hover:bg-brand/5 transition border-b border-zinc-50 dark:border-zinc-800 last:border-0">
                            <p className="text-sm font-semibold">{l.nome}</p>
                            <p className="text-[11px] text-zinc-400">{l.cpf || "Sem CPF"} · {l.telefone || "Sem tel"} · Score: {l.score}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-500">CPF</label>
                      <input value={form.clienteCpf} onChange={(e) => { setForm({ ...form, clienteCpf: e.target.value }); if (e.target.value.length >= 9) searchCliente(e.target.value.replace(/\D/g,"")); }} placeholder="000.000.000-00"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-500">Telefone</label>
                      <input value={form.clienteTelefone} onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })} placeholder="(67) 99999-0000"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-500">Email</label>
                      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-500">UF</label>
                      <input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} placeholder="MS" maxLength={2}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                  </div>

                  {/* Histórico do Cliente */}
                  {selectedLead && searchPropostas.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-4 mt-2">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">📜 Histórico ({searchPropostas.length} negócios)</h3>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {searchPropostas.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between text-[11px]">
                            <span className="font-medium truncate">{p.bancoNome || "—"} · {p.tipoOperacao || "—"}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.status==="PAGA"?"bg-emerald-100 text-emerald-700":p.status==="CANCELADA"?"bg-zinc-100 text-zinc-500":"bg-amber-100 text-amber-700"}`}>{p.status}</span>
                            <span className="font-bold tabular-nums text-emerald-600">{p.valorLiberado ? `R$ ${p.valorLiberado.toLocaleString("pt-BR")}` : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 1: Operação */}
              {formTab === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nº Benefício</label>
                    <input value={form.numeroBeneficio} onChange={(e) => setForm({ ...form, numeroBeneficio: e.target.value })} placeholder="1234567890"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Espécie</label>
                    <input type="number" value={form.especieBeneficio} onChange={(e) => setForm({ ...form, especieBeneficio: e.target.value })} placeholder="41"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo Operação</label>
                    <input value={form.tipoOperacao} onChange={(e) => setForm({ ...form, tipoOperacao: e.target.value })} placeholder="Saque FGTS, Margem Nova..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Convênio</label>
                    <input value={form.convenioNome} onChange={(e) => setForm({ ...form, convenioNome: e.target.value })} placeholder="INSS, FGTS, SIAPE..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">Margem Livre</label>
                    <input type="number" step="0.01" value={form.margemLivre} onChange={(e) => setForm({ ...form, margemLivre: e.target.value })} placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">Margem RMC</label>
                    <input type="number" step="0.01" value={form.margemRmc} onChange={(e) => setForm({ ...form, margemRmc: e.target.value })} placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-zinc-500">Margem RCC</label>
                    <input type="number" step="0.01" value={form.margemRcc} onChange={(e) => setForm({ ...form, margemRcc: e.target.value })} placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                </div>
              )}

              {/* TAB 2: Financeiro */}
              {formTab === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Banco</label>
                    <input value={form.bancoNome} onChange={(e) => setForm({ ...form, bancoNome: e.target.value })} placeholder="UNNO, Facta, BMG..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">Promotora</label>
                    <input value={form.promotora} onChange={(e) => setForm({ ...form, promotora: e.target.value })} placeholder="BEVI, Novo Saque..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Liberado</label>
                    <input type="number" step="0.01" value={form.valorLiberado} onChange={(e) => setForm({ ...form, valorLiberado: e.target.value })} placeholder="5000.00"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">Parcela</label>
                    <input type="number" step="0.01" value={form.valorParcela} onChange={(e) => setForm({ ...form, valorParcela: e.target.value })} placeholder="150.00"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">ADE / Contrato</label>
                    <input value={form.codigoPropostaBanco} onChange={(e) => setForm({ ...form, codigoPropostaBanco: e.target.value })} placeholder="0207381481/ACD"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">Vendedor</label>
                    <input value={form.vendedorNome} onChange={(e) => setForm({ ...form, vendedorNome: e.target.value })} placeholder="Nome do vendedor"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">Banco Origem (Port)</label>
                    <input value={form.bancoOrigem} onChange={(e) => setForm({ ...form, bancoOrigem: e.target.value })} placeholder="Banco de onde vem"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500">Saldo Devedor</label>
                    <input type="number" step="0.01" value={form.saldoDevedor} onChange={(e) => setForm({ ...form, saldoDevedor: e.target.value })} placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-zinc-500">Observações</label>
                    <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre a proposta..." rows={2}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
                  </div>
                </div>
              )}

              {/* Navigation + Submit */}
              <div className="flex justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={() => setFormTab(Math.max(0, formTab - 1))} disabled={formTab === 0}
                  className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 disabled:opacity-30 transition">← Anterior</button>
                <div className="flex gap-2">
                  {formTab < 2 ? (
                    <button type="button" onClick={() => setFormTab(formTab + 1)}
                      className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold hover:bg-zinc-200 transition">Próximo →</button>
                  ) : (
                    <button type="submit" disabled={salvando}
                      className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition">
                      {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {salvando ? "Criando..." : "Criar Proposta"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edição */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Pencil className="h-5 w-5 text-sky-500"/>Editar Proposta</h2>
              <button onClick={() => setEditModal(false)} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={salvarEdicao} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Nome do Cliente *</label>
                  <input required value={editForm.clienteNome} onChange={(e) => setEditForm({ ...editForm, clienteNome: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">CPF</label>
                  <input value={editForm.clienteCpf} onChange={(e) => setEditForm({ ...editForm, clienteCpf: e.target.value })} placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Telefone</label>
                  <input value={editForm.clienteTelefone} onChange={(e) => setEditForm({ ...editForm, clienteTelefone: e.target.value })} placeholder="(11) 99999-0000"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Operação</label>
                  <select value={editForm.tipoOperacao} onChange={(e) => setEditForm({ ...editForm, tipoOperacao: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                    {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Banco</label>
                  <input value={editForm.bancoNome} onChange={(e) => setEditForm({ ...editForm, bancoNome: e.target.value })} placeholder="BMG, Pan..."
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Convênio</label>
                  <input value={editForm.convenioNome} onChange={(e) => setEditForm({ ...editForm, convenioNome: e.target.value })} placeholder="INSS, SIAPE..."
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Banco Origem (Port)</label>
                  <input value={editForm.bancoOrigem} onChange={(e) => setEditForm({ ...editForm, bancoOrigem: e.target.value })} placeholder="Banco de onde vem"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Valor Liberado</label>
                  <input type="number" step="0.01" value={editForm.valorLiberado} onChange={(e) => setEditForm({ ...editForm, valorLiberado: e.target.value })} placeholder="5000.00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Parcela</label>
                  <input type="number" step="0.01" value={editForm.valorParcela} onChange={(e) => setEditForm({ ...editForm, valorParcela: e.target.value })} placeholder="150.00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Prazo (meses)</label>
                  <input type="number" value={editForm.prazo} onChange={(e) => setEditForm({ ...editForm, prazo: e.target.value })} placeholder="84"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Taxa (%)</label>
                  <input type="number" step="0.01" value={editForm.taxaJuros} onChange={(e) => setEditForm({ ...editForm, taxaJuros: e.target.value })} placeholder="1.80"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Saldo Devedor</label>
                  <input type="number" step="0.01" value={editForm.saldoDevedor} onChange={(e) => setEditForm({ ...editForm, saldoDevedor: e.target.value })} placeholder="25000.00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium text-zinc-500">Observações</label>
                  <textarea value={editForm.observacoes} onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })} rows={3} placeholder="Anotações..."
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={excluirProposta} disabled={excluindo}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition disabled:opacity-50">
                  {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {excluindo ? "Excluindo..." : "Excluir"}
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditModal(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
                  <button type="submit" disabled={editando}
                    className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition">
                    {editando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editando ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextStatus(current: string): string | null {
  const flow: Record<string, string> = {
    RASCUNHO: "SIMULADA",
    SIMULADA: "DIGITADA",
    DIGITADA: "PENDENTE",
    PENDENTE: "APROVADA",
    APROVADA: "PAGA",
  };
  return flow[current] || null;
}
