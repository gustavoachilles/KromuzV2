"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Loader2, Search, CheckCircle2, Briefcase, ExternalLink, PlusCircle, CreditCard, Wallet, Banknote, Users
} from "lucide-react";
import { LeadFormModal, BANCOS_BRASIL } from "./LeadFormModal";

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

  const [showLeadFormModal, setShowLeadFormModal] = useState(false);

  // Banco pagamento search
  const [bancoPagQuery, setBancoPagQuery] = useState("");
  const [showBancoPagDropdown, setShowBancoPagDropdown] = useState(false);

  // ── Dados auxiliares (Tabelas e Promotoras) ──
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [promotoras, setPromotoras] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingExtras(true);
      Promise.all([
        fetch("/api/tabelas-comissao").then(r => r.json()),
        fetch("/api/promotoras").then(r => r.json())
      ])
      .then(([tabRes, promRes]) => {
        setTabelas(Array.isArray(tabRes) ? tabRes : []);
        setPromotoras(Array.isArray(promRes) ? promRes : []);
      })
      .catch(() => {})
      .finally(() => setLoadingExtras(false));
    } else {
      // Reset state on close
      setForm(initialFormState);
      limparCliente();
    }
  }, [open]);

  const initialFormState = {
    clienteNome: "", clienteCpf: "", clienteTelefone: "",
    tipoOperacao: "EMPRESTIMO_CONSIGNADO",
    bancoNome: "", bancoOrigem: "", convenioNome: "",
    valorLiberado: "", valorParcela: "",
    prazo: "", taxaJuros: "", saldoDevedor: "",
    observacoes: "", leadId: "",
    tabelaId: "", promotoraId: "",
    codigoPropostaBanco: "", digitadaEm: "", pagaEm: "",
    parcelaAtual: "", prazoAtual: "", parcelasPagas: "", parcelasEmAberto: "", troco: "",
    formaPagamento: "",
    bancoPagamento: "", agenciaPagamento: "", digitoAgenciaPagamento: "", contaPagamento: "", digitoContaPagamento: "",
    chavePix: "", tipoChavePix: ""
  };

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

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

  const abrirCadastroLead = () => {
    setShowDropdown(false);
    setShowLeadFormModal(true);
  };

  const salvarProposta = async () => {
    if (!form.clienteNome) return alert("Preencha o nome do cliente");
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        valorLiberado: form.valorLiberado ? parseFloat(form.valorLiberado) : undefined,
        valorParcela: form.valorParcela ? parseFloat(form.valorParcela) : undefined,
        prazo: form.prazo ? parseInt(form.prazo) : undefined,
        taxaJuros: form.taxaJuros ? parseFloat(form.taxaJuros) : undefined,
        saldoDevedor: form.saldoDevedor ? parseFloat(form.saldoDevedor) : undefined,
        parcelaAtual: form.parcelaAtual ? parseFloat(form.parcelaAtual) : undefined,
        prazoAtual: form.prazoAtual ? parseInt(form.prazoAtual) : undefined,
        parcelasPagas: form.parcelasPagas ? parseInt(form.parcelasPagas) : undefined,
        parcelasEmAberto: form.parcelasEmAberto ? parseInt(form.parcelasEmAberto) : undefined,
        troco: form.troco ? parseFloat(form.troco) : undefined,
        digitadaEm: form.digitadaEm ? new Date(form.digitadaEm).toISOString() : undefined,
        pagaEm: form.pagaEm ? new Date(form.pagaEm).toISOString() : undefined,
      };

      // Clean up empty strings to undefined
      Object.keys(payload).forEach(key => {
        if (payload[key] === "") payload[key] = undefined;
      });

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
  const labelClass = "text-xs font-semibold text-zinc-500 uppercase tracking-wider";
  
  const isPort = form.tipoOperacao.includes("PORT");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-4xl mx-4 max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900 rounded-t-3xl">
          <h2 className="font-bold flex items-center gap-2 text-xl text-zinc-800 dark:text-zinc-100">
            <Briefcase className="h-6 w-6 text-orange-500" />
            Nova Proposta
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          {/* ─── BUSCAR CLIENTE ─── */}
          <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <label className={labelClass}>Buscar Cliente *</label>
            {clienteSelecionado ? (
              <div className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-300/50 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-emerald-900 dark:text-emerald-100">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{clienteSelecionado.cpf || "Sem CPF"} · {clienteSelecionado.telefone || "Sem telefone"}</p>
                </div>
                <button onClick={limparCliente} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative mt-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input type="text" value={clienteQuery} onChange={e => buscarClientes(e.target.value)}
                  onFocus={() => clienteResults.length > 0 && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="Digite nome, CPF ou telefone..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50 shadow-sm transition text-sm" />
                {clienteSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />}
                
                {showDropdown && clienteQuery.length >= 2 && (
                  <div className="absolute z-10 mt-2 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      {clienteResults.length === 0 && !clienteSearching ? (
                        <div className="p-4 space-y-3">
                          <p className="text-sm text-zinc-500 text-center font-medium">Nenhum cliente encontrado</p>
                        </div>
                      ) : (
                        <div className="py-2">
                          {clienteResults.map(lead => (
                            <button key={lead.id} onClick={() => selecionarCliente(lead)}
                              className="w-full text-left px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition border-b border-zinc-100 dark:border-zinc-700/50 last:border-0">
                              <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{lead.nome}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">{lead.cpf || "Sem CPF"} · {lead.telefone || "Sem telefone"}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 border-t border-zinc-200 dark:border-zinc-700">
                      <button onClick={abrirCadastroLead}
                        className="w-full justify-center px-4 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm font-semibold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Cadastrar novo cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ─── DADOS GERAIS ─── */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2">Detalhes da Operação</h3>
              
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{isPort ? "Banco Destino" : "Banco"}</label>
                  <select value={form.bancoNome} onChange={e => updateForm("bancoNome", e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    {bancos.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Convênio</label>
                  <select value={form.convenioNome} onChange={e => updateForm("convenioNome", e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    {convenios.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              {isPort && (
                <div>
                  <label className={labelClass}>Banco Origem</label>
                  <select value={form.bancoOrigem} onChange={e => updateForm("bancoOrigem", e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    {bancos.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tabela (de comissão)</label>
                  <select value={form.tabelaId} onChange={e => {
                    if (e.target.value === "NEW") {
                      window.open("/comissoes/tabelas", "_blank");
                    } else {
                      updateForm("tabelaId", e.target.value);
                    }
                  }} className={inputClass}>
                    <option value="">Selecione...</option>
                    {tabelas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    <option value="NEW" className="font-semibold text-orange-600">➕ Cadastrar Nova Tabela</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Promotora</label>
                  <select value={form.promotoraId} onChange={e => updateForm("promotoraId", e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    {promotoras.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>ADE/AF</label>
                  <input type="text" value={form.codigoPropostaBanco} onChange={e => updateForm("codigoPropostaBanco", e.target.value)} placeholder="000000000" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Taxa (%)</label>
                  <input type="number" step="0.01" value={form.taxaJuros} onChange={e => updateForm("taxaJuros", e.target.value)} placeholder="1.80" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data Digitação (Banco)</label>
                  <input type="date" value={form.digitadaEm} onChange={e => updateForm("digitadaEm", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Data Pagamento</label>
                  <input type="date" value={form.pagaEm} onChange={e => updateForm("pagaEm", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* ─── VALORES ─── */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2">Valores</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Valor Liberado</label>
                  <input type="number" step="0.01" value={form.valorLiberado} onChange={e => updateForm("valorLiberado", e.target.value)} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{isPort ? "Parcela Nova" : "Parcela"}</label>
                  <input type="number" step="0.01" value={form.valorParcela} onChange={e => updateForm("valorParcela", e.target.value)} placeholder="0.00" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{isPort ? "Prazo Novo (meses)" : "Prazo (meses)"}</label>
                  <input type="number" value={form.prazo} onChange={e => updateForm("prazo", e.target.value)} placeholder="84" className={inputClass} />
                </div>
              </div>

              {isPort && (
                <div className="p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl space-y-4 border border-orange-100 dark:border-orange-900/30">
                  <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5" /> Dados da Portabilidade
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Saldo Devedor</label>
                      <input type="number" step="0.01" value={form.saldoDevedor} onChange={e => updateForm("saldoDevedor", e.target.value)} placeholder="0.00" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Troco</label>
                      <input type="number" step="0.01" value={form.troco} onChange={e => updateForm("troco", e.target.value)} placeholder="0.00" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Parcela Atual</label>
                      <input type="number" step="0.01" value={form.parcelaAtual} onChange={e => updateForm("parcelaAtual", e.target.value)} placeholder="0.00" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Prazo Atual</label>
                      <input type="number" value={form.prazoAtual} onChange={e => updateForm("prazoAtual", e.target.value)} placeholder="84" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Parcelas Pagas</label>
                      <input type="number" value={form.parcelasPagas} onChange={e => updateForm("parcelasPagas", e.target.value)} placeholder="12" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Parcelas em Aberto</label>
                      <input type="number" value={form.parcelasEmAberto} onChange={e => updateForm("parcelasEmAberto", e.target.value)} placeholder="72" className={inputClass} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── DADOS DE PAGAMENTO AO CLIENTE ─── */}
          <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700/50 pb-2 mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-zinc-500" /> Dados de pagamento ao cliente
            </h3>
            <div className="mb-4">
              <label className={labelClass}>Forma de Pagamento</label>
              <select value={form.formaPagamento} onChange={e => updateForm("formaPagamento", e.target.value)} className={`${inputClass} max-w-xs block`}>
                <option value="">Selecione...</option>
                <option value="CONTA">Crédito em conta</option>
                <option value="PIX">Pix</option>
              </select>
            </div>

            {form.formaPagamento === "CONTA" && (
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className={labelClass}>Banco</label>
                  <input type="text"
                    list="bancos-compe-list-proposta"
                    value={form.bancoPagamento}
                    onChange={e => updateForm("bancoPagamento", e.target.value)}
                    placeholder="Nome ou código COMPE"
                    className={inputClass} />
                  <datalist id="bancos-compe-list-proposta">
                    {BANCOS_BRASIL.map(b => <option key={b.compe} value={`${b.compe} - ${b.nome}`} />)}
                  </datalist>
                </div>
                <div>
                  <label className={labelClass}>Agência</label>
                  <div className="flex items-center gap-1">
                    <input type="text" value={form.agenciaPagamento} onChange={e => updateForm("agenciaPagamento", e.target.value)} placeholder="0000" className={`${inputClass} w-20`} />
                    <span className="text-zinc-400 font-bold mt-1">-</span>
                    <input type="text" value={form.digitoAgenciaPagamento} onChange={e => updateForm("digitoAgenciaPagamento", e.target.value)} placeholder="0" maxLength={2} className={`${inputClass} w-10 text-center`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Conta</label>
                  <div className="flex items-center gap-1">
                    <input type="text" value={form.contaPagamento} onChange={e => updateForm("contaPagamento", e.target.value)} placeholder="00000" className={`${inputClass} w-24`} />
                    <span className="text-zinc-400 font-bold mt-1">-</span>
                    <input type="text" value={form.digitoContaPagamento} onChange={e => updateForm("digitoContaPagamento", e.target.value)} placeholder="0" maxLength={2} className={`${inputClass} w-10 text-center`} />
                  </div>
                </div>
              </div>
            )}

            {form.formaPagamento === "PIX" && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className={labelClass}>Tipo de Chave Pix</label>
                  <select value={form.tipoChavePix} onChange={e => updateForm("tipoChavePix", e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    <option value="CPF">CPF</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="ALEATORIA">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Chave Pix</label>
                  <input type="text" value={form.chavePix} onChange={e => updateForm("chavePix", e.target.value)} placeholder="Sua chave..." className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* ─── OBSERVAÇÕES ─── */}
          <div>
            <label className={labelClass}>Observações Adicionais</label>
            <textarea value={form.observacoes} onChange={e => updateForm("observacoes", e.target.value)} placeholder="Anotações importantes..." rows={3}
              className={`${inputClass} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-2.5 font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition">Cancelar</button>
          <button onClick={salvarProposta} disabled={saving || !form.clienteNome}
            className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-600/30">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Briefcase className="h-5 w-5" />}
            Cadastrar e Abrir
          </button>
        </div>
      </div>

      <LeadFormModal
        open={showLeadFormModal}
        onClose={() => setShowLeadFormModal(false)}
        leadSelecionado={null}
        initialNome={clienteQuery}
        bancos={bancos}
        convenios={convenios}
        onSuccess={(lead) => {
          selecionarCliente(lead);
          setShowLeadFormModal(false);
        }}
      />
    </div>
  );
}
