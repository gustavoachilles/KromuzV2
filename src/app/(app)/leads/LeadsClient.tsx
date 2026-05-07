"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  X,
  Loader2,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  User,
  DollarSign,
} from "lucide-react";

type Lead = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  uf: string | null;
  status: string;
  origem: string | null;
  tipoOperacao: string | null;
  valorEstimado: number | null;
  bancoPreferido: string | null;
  vendedorNome: string | null;
  observacoes: string | null;
  ultimoContato: string | Date | null;
  createdAt: string | Date;
};

type Contagem = { status: string; _count: number };

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  NOVO: { label: "Novo", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", dot: "bg-blue-500" },
  CONTATO: { label: "Em Contato", color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400", dot: "bg-yellow-500" },
  QUALIFICADO: { label: "Qualificado", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400", dot: "bg-purple-500" },
  PROPOSTA: { label: "Proposta", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400", dot: "bg-orange-500" },
  APROVADO: { label: "Aprovado", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", dot: "bg-emerald-500" },
  PAGO: { label: "Pago", color: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400", dot: "bg-violet-500" },
  PERDIDO: { label: "Perdido", color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400", dot: "bg-red-500" },
};

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova",
  REFINANCIAMENTO: "Refin",
  PORTABILIDADE: "Port",
  PORTABILIDADE_REFIN: "Port+Refin",
  CARTAO_CONSIGNADO: "RMC",
  CARTAO_BENEFICIO: "RCC",
};

const origemLabel: Record<string, string> = {
  manual: "Manual",
  indicacao: "Indicação",
  site: "Site",
  whatsapp: "WhatsApp",
  importacao: "Importação",
};

const pipelineOrder = ["NOVO", "CONTATO", "QUALIFICADO", "PROPOSTA", "APROVADO", "PAGO"];

export function LeadsClient({ leads: leadsIniciais, contagens }: { leads: Lead[]; contagens: Contagem[] }) {
  const router = useRouter();
  const [leads] = useState(leadsIniciais);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "", cpf: "", telefone: "", email: "", uf: "",
    tipoOperacao: "", valorEstimado: "", bancoPreferido: "",
    origem: "manual", observacoes: "",
  });

  const filtrados = leads.filter((l) => {
    if (filtroStatus && l.status !== filtroStatus) return false;
    if (busca) {
      const s = busca.toLowerCase();
      if (!l.nome.toLowerCase().includes(s) && !l.cpf?.includes(s) && !l.telefone?.includes(s)) return false;
    }
    return true;
  });

  const pipelineData = pipelineOrder.map((s) => ({
    status: s,
    ...statusConfig[s],
    count: contagens.find((c) => c.status === s)?._count || 0,
  }));
  const totalAtivos = pipelineData.reduce((a, b) => a + b.count, 0);
  const perdidos = contagens.find((c) => c.status === "PERDIDO")?._count || 0;

  async function criarLead(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome,
        cpf: form.cpf || undefined,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        uf: form.uf || undefined,
        tipoOperacao: form.tipoOperacao || undefined,
        valorEstimado: form.valorEstimado ? Number(form.valorEstimado) : undefined,
        bancoPreferido: form.bancoPreferido || undefined,
        origem: form.origem,
        observacoes: form.observacoes || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setErro(data.error); setSalvando(false); return; }

    setModal(false);
    setSalvando(false);
    setForm({ nome: "", cpf: "", telefone: "", email: "", uf: "", tipoOperacao: "", valorEstimado: "", bancoPreferido: "", origem: "manual", observacoes: "" });
    router.refresh();
  }

  async function avancarStatus(leadId: string, novoStatus: string) {
    setAtualizando(leadId);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setAtualizando(null);
    router.refresh();
  }

  function getNextStatus(current: string): string | null {
    const flow: Record<string, string> = {
      NOVO: "CONTATO", CONTATO: "QUALIFICADO", QUALIFICADO: "PROPOSTA",
      PROPOSTA: "APROVADO", APROVADO: "PAGO",
    };
    return flow[current] || null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
              <Users className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">CRM</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Leads</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {totalAtivos} ativo{totalAtivos !== 1 ? "s" : ""} · {perdidos} perdido{perdidos !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition">
            <Plus className="h-4 w-4" /> Novo Lead
          </button>
        </header>

        {/* Pipeline */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {pipelineData.map((p) => (
            <button key={p.status}
              onClick={() => setFiltroStatus(filtroStatus === p.status ? "" : p.status)}
              className={`rounded-xl border p-4 text-left transition hover:shadow-md ${
                filtroStatus === p.status ? "border-violet-400 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
                <span className="text-xs text-zinc-500 font-medium">{p.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{p.count}</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CPF ou telefone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
          </div>
          {filtroStatus && (
            <button onClick={() => setFiltroStatus("")}
              className="flex items-center gap-1 text-xs text-violet-600 border border-violet-200 rounded-lg px-3 py-2 hover:bg-violet-50 transition">
              <Filter className="h-3 w-3" /> {statusConfig[filtroStatus]?.label} <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhum lead encontrado</h3>
            <p className="text-sm text-zinc-400 mt-1">Crie um lead ou ajuste os filtros.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((lead) => {
              const cfg = statusConfig[lead.status] || statusConfig.NOVO;
              const next = getNextStatus(lead.status);

              return (
                <div key={lead.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-4 flex-wrap hover:shadow-sm transition">
                  {/* Status */}
                  <div className={`h-3 w-3 rounded-full shrink-0 ${cfg.dot}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-semibold text-sm">{lead.nome}</p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
                      {lead.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</span>}
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                      {lead.uf && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.uf}</span>}
                      {lead.tipoOperacao && <span>{tipoLabel[lead.tipoOperacao] || lead.tipoOperacao}</span>}
                    </div>
                  </div>

                  {/* Valor */}
                  {lead.valorEstimado && (
                    <div className="flex items-center gap-1 text-sm font-bold tabular-nums shrink-0">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      R$ {lead.valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  )}

                  {/* Origem */}
                  {lead.origem && (
                    <span className="text-[10px] text-zinc-400 shrink-0">{origemLabel[lead.origem] || lead.origem}</span>
                  )}

                  {/* Vendedor */}
                  {lead.vendedorNome && (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 shrink-0">
                      <User className="h-3 w-3" />{lead.vendedorNome}
                    </span>
                  )}

                  {/* Status badge */}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>

                  {/* Ação */}
                  {next && (
                    <button disabled={atualizando === lead.id} onClick={() => avancarStatus(lead.id, next)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:border-violet-400 hover:text-violet-600 transition disabled:opacity-50 shrink-0">
                      {atualizando === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                      {statusConfig[next]?.label}
                    </button>
                  )}

                  {/* Data */}
                  <span className="text-[10px] text-zinc-400 tabular-nums flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h2 className="text-lg font-semibold">Novo Lead</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={criarLead} className="p-6 space-y-4">
              {erro && <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{erro}</div>}

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="João da Silva"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">CPF</label>
                  <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Telefone</label>
                  <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-0000"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">E-mail</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="joao@email.com"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">UF</label>
                  <input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} placeholder="SP"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Tipo</label>
                  <select value={form.tipoOperacao} onChange={(e) => setForm({ ...form, tipoOperacao: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                    <option value="">—</option>
                    {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Valor Est.</label>
                  <input type="number" step="0.01" value={form.valorEstimado} onChange={(e) => setForm({ ...form, valorEstimado: e.target.value })} placeholder="5000"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Origem</label>
                  <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                    {Object.entries(origemLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {salvando ? "Criando..." : "Criar Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
