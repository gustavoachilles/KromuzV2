"use client";

import { useState, useRef } from "react";
import {
  X, Loader2, Search, CheckCircle2, Briefcase, ExternalLink,
} from "lucide-react";

type BancoOption = { id: string; nome: string };
type ConvenioOption = { id: string; nome: string };

export function NovaPropostaModal({
  open,
  onClose,
  onSuccess,
  bancos,
  convenios,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (proposta: any) => void;
  bancos: BancoOption[];
  convenios: ConvenioOption[];
}) {
  // ── Busca de cliente ──
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResults, setClienteResults] = useState<any[]>([]);
  const [clienteSearching, setClienteSearching] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  // ── Formulário da proposta ──
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clienteNome: "", clienteCpf: "", clienteTelefone: "",
    tipoOperacao: "EMPRESTIMO_CONSIGNADO",
    bancoNome: "", bancoOrigem: "", convenioNome: "",
    valorLiberado: "", valorParcela: "",
    prazo: "", taxaJuros: "", saldoDevedor: "",
    observacoes: "", leadId: "",
  });

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Busca com debounce ──
  const buscarClientes = (query: string) => {
    setClienteQuery(query);
    setShowDropdown(true);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (query.length < 2) { setClienteResults([]); return; }
    searchRef.current = setTimeout(async () => {
      setClienteSearching(true);
      try {
        const res = await fetch(`/api/leads/buscar?q=${encodeURIComponent(query)}`);
        if (res.ok) setClienteResults(await res.json());
      } catch {}
      setClienteSearching(false);
    }, 300);
  };

  const selecionarCliente = (lead: any) => {
    setClienteSelecionado(lead);
    setClienteQuery(lead.nome);
    setShowDropdown(false);
    setForm(prev => ({
      ...prev,
      clienteNome: lead.nome,
      clienteCpf: lead.cpf || "",
      clienteTelefone: lead.telefone || "",
      leadId: lead.id,
    }));
  };

  const limparCliente = () => {
    setClienteSelecionado(null);
    setClienteQuery("");
    setForm(prev => ({ ...prev, clienteNome: "", clienteCpf: "", clienteTelefone: "", leadId: "" }));
  };

  // ── Abrir o cadastro de leads (mesmo formulário da aba Leads) ──
  const abrirCadastroLead = () => {
    setShowDropdown(false);
    window.open("/leads?novo=true", "_blank");
  };

  // ── Salvar proposta ──
  const salvarProposta = async () => {
    if (!form.clienteNome) return alert("Preencha o nome do cliente");
    setSaving(true);
    try {
      const payload: any = {
        clienteNome: form.clienteNome,
        clienteCpf: form.clienteCpf || undefined,
        clienteTelefone: form.clienteTelefone || undefined,
        tipoOperacao: form.tipoOperacao,
        bancoNome: form.bancoNome || undefined,
        bancoOrigem: form.bancoOrigem || undefined,
        convenioNome: form.convenioNome || undefined,
        valorLiberado: form.valorLiberado ? parseFloat(form.valorLiberado) : undefined,
        valorParcela: form.valorParcela ? parseFloat(form.valorParcela) : undefined,
        prazo: form.prazo ? parseInt(form.prazo) : undefined,
        taxaJuros: form.taxaJuros ? parseFloat(form.taxaJuros) : undefined,
        saldoDevedor: form.saldoDevedor ? parseFloat(form.saldoDevedor) : undefined,
        observacoes: form.observacoes || undefined,
        leadId: form.leadId || undefined,
      };
      const res = await fetch("/api/propostas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        onSuccess(await res.json());
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar proposta");
      }
    } catch { alert("Erro na requisição"); }
    setSaving(false);
  };



  if (!open) return null;

  const inputClass = "mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm";
  const labelClass = "text-xs font-semibold text-zinc-500 uppercase";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h2 className="font-bold flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-orange-500" />
            Nova Proposta
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* ─── BUSCAR CLIENTE ─── */}
          <div className="relative">
            <label className={labelClass}>Buscar Cliente *</label>
            {clienteSelecionado ? (
              <div className="mt-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-zinc-500">{clienteSelecionado.cpf || "Sem CPF"} · {clienteSelecionado.telefone || "Sem telefone"}</p>
                </div>
                <button onClick={limparCliente} className="text-zinc-400 hover:text-red-500 transition"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input type="text" value={clienteQuery} onChange={e => buscarClientes(e.target.value)}
                    onFocus={() => clienteResults.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Digite nome, CPF ou telefone..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                  {clienteSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />}
                </div>
                {showDropdown && clienteQuery.length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {clienteResults.length === 0 && !clienteSearching ? (
                      <div className="p-3 space-y-2">
                        <p className="text-xs text-zinc-400 text-center">Nenhum cliente encontrado</p>
                        <button onClick={abrirCadastroLead}
                          className="w-full text-left px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium hover:bg-orange-100 transition flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" /> Cadastrar novo cliente na aba de Leads
                        </button>
                      </div>
                    ) : (
                      clienteResults.map(lead => (
                        <button key={lead.id} onClick={() => selecionarCliente(lead)}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                          <p className="font-semibold text-sm">{lead.nome}</p>
                          <p className="text-xs text-zinc-500">{lead.cpf || "Sem CPF"} · {lead.telefone || "Sem telefone"}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── TIPO + BANCO + CONVÊNIO ─── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo de Operação *</label>
              <select value={form.tipoOperacao} onChange={e => updateForm("tipoOperacao", e.target.value)} className={inputClass}>
                <option value="EMPRESTIMO_CONSIGNADO">Novo</option>
                <option value="PORTABILIDADE">Portabilidade</option>
                <option value="REFINANCIAMENTO">Refinanciamento</option>
                <option value="PORTABILIDADE_REFIN">Port + Refin</option>
                <option value="CARTAO_CONSIGNADO">Cartão Consignado</option>
                <option value="CARTAO_BENEFICIO">Cartão Benefício</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Banco Destino</label>
              <select value={form.bancoNome} onChange={e => updateForm("bancoNome", e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {bancos.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Convênio</label>
              <select value={form.convenioNome} onChange={e => updateForm("convenioNome", e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {convenios.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Banco Origem {form.tipoOperacao.includes("PORT") ? "(Port)" : ""}</label>
              <select value={form.bancoOrigem} onChange={e => updateForm("bancoOrigem", e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {bancos.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
              </select>
            </div>
          </div>

          {/* ─── VALORES ─── */}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Valor Liberado</label><input type="number" step="0.01" value={form.valorLiberado} onChange={e => updateForm("valorLiberado", e.target.value)} placeholder="5000.00" className={inputClass} /></div>
            <div><label className={labelClass}>Parcela</label><input type="number" step="0.01" value={form.valorParcela} onChange={e => updateForm("valorParcela", e.target.value)} placeholder="150.00" className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Prazo (meses)</label><input type="number" value={form.prazo} onChange={e => updateForm("prazo", e.target.value)} placeholder="84" className={inputClass} /></div>
            <div><label className={labelClass}>Taxa (%)</label><input type="number" step="0.01" value={form.taxaJuros} onChange={e => updateForm("taxaJuros", e.target.value)} placeholder="1.80" className={inputClass} /></div>
            <div><label className={labelClass}>Saldo Devedor</label><input type="number" step="0.01" value={form.saldoDevedor} onChange={e => updateForm("saldoDevedor", e.target.value)} placeholder="25000.00" className={inputClass} /></div>
          </div>

          {/* ─── OBSERVAÇÕES ─── */}
          <div>
            <label className={labelClass}>Observações</label>
            <textarea value={form.observacoes} onChange={e => updateForm("observacoes", e.target.value)} placeholder="Anotações..." rows={3}
              className={`${inputClass} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 font-semibold text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
          <button onClick={salvarProposta} disabled={saving || !form.clienteNome}
            className="px-6 py-2.5 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/25">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
            Cadastrar e Abrir
          </button>
        </div>
      </div>
    </div>
  );
}
