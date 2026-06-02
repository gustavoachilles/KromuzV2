"use client";

import { useState, useRef } from "react";
import {
  X, Loader2, Search, CheckCircle2, Briefcase, Plus, User,
} from "lucide-react";

type BancoOption = { id: string; nome: string };
type ConvenioOption = { id: string; nome: string };

// ── Máscaras ──
const formatarCpf = (v: string) =>
  v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").substring(0, 14);
const formatarTelefone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);
};

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

  // ── Sub-modal cadastro de lead completo ──
  const [novoLeadModal, setNovoLeadModal] = useState(false);
  const [novoLeadSaving, setNovoLeadSaving] = useState(false);
  const [novoLeadForm, setNovoLeadForm] = useState({
    nome: "", cpf: "", telefone: "", email: "",
    uf: "", cidade: "", dataNascimento: "",
    numeroBeneficio: "", especieBeneficio: "",
    margemLivre: "", margemRmc: "", margemRcc: "",
    renda: "", observacoes: "", origem: "manual",
  });

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

  // ── Abrir modal de cadastro de lead ──
  const abrirNovoLeadModal = () => {
    setNovoLeadForm({
      nome: clienteQuery, cpf: "", telefone: "", email: "",
      uf: "", cidade: "", dataNascimento: "",
      numeroBeneficio: "", especieBeneficio: "",
      margemLivre: "", margemRmc: "", margemRcc: "",
      renda: "", observacoes: "", origem: "manual",
    });
    setShowDropdown(false);
    setNovoLeadModal(true);
  };

  const salvarNovoLead = async () => {
    if (!novoLeadForm.nome) return alert("Nome é obrigatório");
    setNovoLeadSaving(true);
    try {
      const payload: any = { ...novoLeadForm };
      if (payload.cpf) payload.cpf = payload.cpf.replace(/\D/g, "");
      if (payload.telefone) payload.telefone = payload.telefone.replace(/\D/g, "");
      if (payload.especieBeneficio) payload.especieBeneficio = Number(payload.especieBeneficio);
      if (payload.margemLivre) payload.margemLivre = Number(payload.margemLivre);
      if (payload.margemRmc) payload.margemRmc = Number(payload.margemRmc);
      if (payload.margemRcc) payload.margemRcc = Number(payload.margemRcc);
      if (payload.renda) payload.renda = Number(payload.renda);
      Object.keys(payload).forEach(k => { if (payload[k] === "") delete payload[k]; });

      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const lead = await res.json();
        selecionarCliente(lead);
        setNovoLeadModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao cadastrar cliente");
      }
    } catch { alert("Erro na requisição"); }
    setNovoLeadSaving(false);
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

  // Reset ao abrir
  const resetModal = () => {
    setClienteSelecionado(null);
    setClienteQuery("");
    setClienteResults([]);
    setForm({
      clienteNome: "", clienteCpf: "", clienteTelefone: "",
      tipoOperacao: "EMPRESTIMO_CONSIGNADO",
      bancoNome: "", bancoOrigem: "", convenioNome: "",
      valorLiberado: "", valorParcela: "",
      prazo: "", taxaJuros: "", saldoDevedor: "",
      observacoes: "", leadId: "",
    });
  };

  if (!open) return null;

  const inputClass = "mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm";
  const labelClass = "text-xs font-semibold text-zinc-500 uppercase";

  return (
    <>
      {/* ════ MODAL PRINCIPAL ════ */}
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
                          <button onClick={abrirNovoLeadModal}
                            className="w-full text-left px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium hover:bg-orange-100 transition flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Cadastrar &quot;{clienteQuery}&quot; como novo cliente
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

      {/* ════ SUB-MODAL: CADASTRO COMPLETO DE CLIENTE ════ */}
      {novoLeadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setNovoLeadModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-emerald-500" />
                Cadastrar Novo Cliente
              </h2>
              <button onClick={() => setNovoLeadModal(false)} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Dados pessoais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Nome Completo *</label>
                  <input type="text" value={novoLeadForm.nome} onChange={e => setNovoLeadForm(f => ({ ...f, nome: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input type="text" value={novoLeadForm.cpf} onChange={e => setNovoLeadForm(f => ({ ...f, cpf: formatarCpf(e.target.value) }))} placeholder="000.000.000-00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input type="text" value={novoLeadForm.telefone} onChange={e => setNovoLeadForm(f => ({ ...f, telefone: formatarTelefone(e.target.value) }))} placeholder="(00) 00000-0000" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={novoLeadForm.email} onChange={e => setNovoLeadForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Data de Nascimento</label>
                  <input type="date" value={novoLeadForm.dataNascimento} onChange={e => setNovoLeadForm(f => ({ ...f, dataNascimento: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>UF</label>
                  <input type="text" value={novoLeadForm.uf} onChange={e => setNovoLeadForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} placeholder="MS" maxLength={2} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input type="text" value={novoLeadForm.cidade} onChange={e => setNovoLeadForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Campo Grande" className={inputClass} />
                </div>
              </div>

              {/* Benefício INSS */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Benefício INSS</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nº Benefício</label>
                    <input type="text" value={novoLeadForm.numeroBeneficio} onChange={e => setNovoLeadForm(f => ({ ...f, numeroBeneficio: e.target.value }))} placeholder="1234567890" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Espécie</label>
                    <input type="number" value={novoLeadForm.especieBeneficio} onChange={e => setNovoLeadForm(f => ({ ...f, especieBeneficio: e.target.value }))} placeholder="41" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Margens */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Margens</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Margem Livre</label>
                    <input type="number" step="0.01" value={novoLeadForm.margemLivre} onChange={e => setNovoLeadForm(f => ({ ...f, margemLivre: e.target.value }))} placeholder="0.00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Margem RMC</label>
                    <input type="number" step="0.01" value={novoLeadForm.margemRmc} onChange={e => setNovoLeadForm(f => ({ ...f, margemRmc: e.target.value }))} placeholder="0.00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Margem RCC</label>
                    <input type="number" step="0.01" value={novoLeadForm.margemRcc} onChange={e => setNovoLeadForm(f => ({ ...f, margemRcc: e.target.value }))} placeholder="0.00" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Renda e Observações */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Renda</label>
                  <input type="number" step="0.01" value={novoLeadForm.renda} onChange={e => setNovoLeadForm(f => ({ ...f, renda: e.target.value }))} placeholder="2500.00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Observações</label>
                  <input type="text" value={novoLeadForm.observacoes} onChange={e => setNovoLeadForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Anotações..." className={inputClass} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
              <button onClick={() => setNovoLeadModal(false)} className="px-4 py-2 font-semibold text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
              <button onClick={salvarNovoLead} disabled={novoLeadSaving || !novoLeadForm.nome}
                className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/25">
                {novoLeadSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Cadastrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
