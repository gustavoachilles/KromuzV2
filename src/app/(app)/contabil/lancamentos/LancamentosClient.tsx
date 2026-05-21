"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, X, Check, Trash2, Edit3, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Receipt, DollarSign, Clock, CalendarDays, Loader2
} from "lucide-react";
import { SkeletonKPI, SkeletonTable } from "@/components/ui/Skeleton";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

type Categoria = { id: string; nome: string; tipo: string; grupo: string | null; icone?: string; cor?: string };
type ContaBancaria = { id: string; nomeBanco: string; cor?: string };
type Lancamento = {
  id: string; tipo: string; natureza: string; descricao: string; valor: number; valorPago?: number;
  dataCompetencia: string; dataVencimento: string; dataPagamento?: string;
  status: string; formaPagamento?: string; parcela?: number; totalParcelas?: number;
  observacoes?: string; categoria: Categoria; contaBancaria?: ContaBancaria;
};

export function LancamentosClient() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [busca, setBusca] = useState("");

  // Form state
  const [form, setForm] = useState({
    categoriaId: "", contaBancariaId: "", tipo: "DESPESA", natureza: "AVULSO", descricao: "",
    valor: "", dataCompetencia: "", dataVencimento: "", dataPagamento: "", status: "PENDENTE",
    formaPagamento: "", observacoes: "", totalParcelas: "1",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resL, resC, resCB] = await Promise.all([
        fetch(`/api/contabil/lancamentos?mes=${mes}&ano=${ano}&limit=50`),
        fetch("/api/contabil/categorias"),
        fetch("/api/contabil/contas-bancarias"),
      ]);
      if (resL.ok) {
        const data = await resL.json();
        setLancamentos(data.items || []);
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore || false);
      }
      if (resC.ok) setCategorias(await resC.json());
      if (resCB.ok) setContas(await resCB.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [mes, ano]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/contabil/lancamentos?mes=${mes}&ano=${ano}&limit=50&cursor=${nextCursor}`);
      if (r.ok) {
        const data = await r.json();
        setLancamentos(prev => [...prev, ...(data.items || [])]);
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore || false);
      }
    } catch {}
    setLoadingMore(false);
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const prevMonth = () => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); };
  const nextMonth = () => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); };

  const abrirNovo = () => {
    setEditando(null);
    const hoje = new Date().toISOString().split("T")[0];
    setForm({
      categoriaId: "", contaBancariaId: "", tipo: "DESPESA", natureza: "AVULSO", descricao: "",
      valor: "", dataCompetencia: hoje, dataVencimento: hoje, dataPagamento: "", status: "PENDENTE",
      formaPagamento: "", observacoes: "", totalParcelas: "1",
    });
    setShowModal(true);
  };

  const abrirEditar = (l: Lancamento) => {
    setEditando(l);
    setForm({
      categoriaId: l.categoria.id, contaBancariaId: l.contaBancaria?.id || "", tipo: l.tipo,
      natureza: l.natureza, descricao: l.descricao, valor: String(l.valor),
      dataCompetencia: l.dataCompetencia.split("T")[0], dataVencimento: l.dataVencimento.split("T")[0],
      dataPagamento: l.dataPagamento ? l.dataPagamento.split("T")[0] : "",
      status: l.status, formaPagamento: l.formaPagamento || "", observacoes: l.observacoes || "",
      totalParcelas: "1",
    });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.categoriaId || !form.descricao || !form.valor) return;
    const payload = {
      ...form,
      valor: parseFloat(form.valor),
      totalParcelas: parseInt(form.totalParcelas) || 1,
      contaBancariaId: form.contaBancariaId || null,
      dataPagamento: form.dataPagamento || null,
    };

    if (editando) {
      await fetch("/api/contabil/lancamentos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editando.id, ...payload }),
      });
    } else {
      await fetch("/api/contabil/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowModal(false);
    fetchAll();
  };

  const marcarPago = async (id: string) => {
    await fetch("/api/contabil/lancamentos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "PAGO" }),
    });
    fetchAll();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch(`/api/contabil/lancamentos?id=${id}`, { method: "DELETE" });
    fetchAll();
  };

  // Filtros
  const filtrados = lancamentos.filter(l => {
    if (filtroTipo && l.tipo !== filtroTipo) return false;
    if (filtroStatus && l.status !== filtroStatus) return false;
    if (busca && !l.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const totalReceitas = filtrados.filter(l => l.tipo === "RECEITA").reduce((s, l) => s + l.valor, 0);
  const totalDespesas = filtrados.filter(l => l.tipo === "DESPESA").reduce((s, l) => s + l.valor, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Receipt className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Financeiro</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Contas a Pagar / Receber
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 shadow-sm">
              <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronLeft className="h-4 w-4 text-zinc-500" /></button>
              <span className="font-bold text-zinc-900 dark:text-white min-w-[120px] text-center text-sm">{MESES[mes - 1]} {ano}</span>
              <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronRight className="h-4 w-4 text-zinc-500" /></button>
            </div>
            <button onClick={abrirNovo} className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-brand/20">
              <Plus className="h-4 w-4" /> Novo Lançamento
            </button>
          </div>
        </header>

        {/* Resumo Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-600 font-semibold uppercase">Receitas</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalReceitas)}</p>
            </div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
            <ArrowDownRight className="h-5 w-5 text-rose-600" />
            <div>
              <p className="text-xs text-rose-600 font-semibold uppercase">Despesas</p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{fmt(totalDespesas)}</p>
            </div>
          </div>
          <div className={`${totalReceitas - totalDespesas >= 0 ? 'bg-zinc-50 dark:bg-zinc-900' : 'bg-rose-50 dark:bg-rose-950/30'} border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3`}>
            <DollarSign className="h-5 w-5 text-zinc-600" />
            <div>
              <p className="text-xs text-zinc-500 font-semibold uppercase">Saldo</p>
              <p className={`text-lg font-bold ${totalReceitas - totalDespesas >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {fmt(totalReceitas - totalDespesas)}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros + Busca */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text" placeholder="Buscar lançamento..." value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-brand/30 outline-none"
            />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm">
            <option value="">Todos os tipos</option>
            <option value="RECEITA">Receitas</option>
            <option value="DESPESA">Despesas</option>
            <option value="IMPOSTO">Impostos</option>
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm">
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="VENCIDO">Vencido</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonKPI count={3} />
            <SkeletonTable rows={8} cols={7} />
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                  <th className="text-left py-3 px-4 text-zinc-400 font-semibold">Descrição</th>
                  <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Categoria</th>
                  <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Conta</th>
                  <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Vencimento</th>
                  <th className="text-right py-3 px-2 text-zinc-400 font-semibold">Valor</th>
                  <th className="text-center py-3 px-2 text-zinc-400 font-semibold">Status</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-zinc-400">Nenhum lançamento encontrado.</td></tr>
                ) : filtrados.map((l, i) => (
                  <motion.tr
                    key={l.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900 dark:text-white">{l.descricao}</div>
                      {l.parcela && <span className="text-[11px] text-zinc-400">Parcela {l.parcela}/{l.totalParcelas}</span>}
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {l.categoria?.cor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.categoria.cor }} />}
                        {l.categoria?.nome}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-zinc-500">{l.contaBancaria?.nomeBanco || "—"}</td>
                    <td className="py-3 px-2 text-xs text-zinc-500">{fmtDate(l.dataVencimento)}</td>
                    <td className={`py-3 px-2 text-right font-bold ${l.tipo === "RECEITA" ? "text-emerald-600" : "text-rose-600"}`}>
                      {l.tipo === "RECEITA" ? "+" : "-"} {fmt(l.valor)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        l.status === "PAGO" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                        l.status === "VENCIDO" ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" :
                        l.status === "CANCELADO" ? "bg-zinc-100 text-zinc-500" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                      }`}>{l.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {l.status === "PENDENTE" && (
                          <button onClick={() => marcarPago(l.id)} title="Marcar como Pago" className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 transition-colors">
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => abrirEditar(l)} title="Editar" className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => excluir(l.id)} title="Excluir" className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Carregar Mais */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button onClick={loadMore} disabled={loadingMore}
                className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loadingMore ? "Carregando..." : `Carregar mais (${lancamentos.length} exibidos)`}
              </button>
            </div>
          )}
        )}

        {/* Modal de Criação/Edição */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {editando ? "Editar Lançamento" : "Novo Lançamento"}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-4">
                  {/* Tipo */}
                  <div className="grid grid-cols-3 gap-2">
                    {["DESPESA", "RECEITA", "IMPOSTO"].map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                        className={`py-2 rounded-xl text-sm font-bold transition-all ${form.tipo === t
                          ? t === "RECEITA" ? "bg-emerald-500 text-white" : t === "DESPESA" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
                        {t === "RECEITA" ? "Receita" : t === "DESPESA" ? "Despesa" : "Imposto"}
                      </button>
                    ))}
                  </div>

                  {/* Descrição */}
                  <input type="text" placeholder="Descrição (ex: Aluguel Maio)" value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-brand/30 outline-none" />

                  {/* Valor + Parcelas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Valor (R$)</label>
                      <input type="number" step="0.01" placeholder="0,00" value={form.valor}
                        onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    </div>
                    {!editando && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Parcelas</label>
                        <input type="number" min="1" max="48" value={form.totalParcelas}
                          onChange={e => setForm(f => ({ ...f, totalParcelas: e.target.value }))}
                          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                      </div>
                    )}
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Categoria</label>
                    <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                      <option value="">Selecione...</option>
                      {categorias.filter(c => c.tipo === form.tipo || !form.tipo).map(c => (
                        <option key={c.id} value={c.id}>{c.nome} {c.grupo ? `(${c.grupo})` : ""}</option>
                      ))}
                    </select>
                  </div>

                  {/* Conta Bancária */}
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Conta Bancária (opcional)</label>
                    <select value={form.contaBancariaId} onChange={e => setForm(f => ({ ...f, contaBancariaId: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                      <option value="">Nenhuma</option>
                      {contas.map(c => <option key={c.id} value={c.id}>{c.nomeBanco}</option>)}
                    </select>
                  </div>

                  {/* Datas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Competência</label>
                      <input type="date" value={form.dataCompetencia}
                        onChange={e => setForm(f => ({ ...f, dataCompetencia: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Vencimento</label>
                      <input type="date" value={form.dataVencimento}
                        onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    </div>
                  </div>

                  {/* Status + Pagamento */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                        <option value="PENDENTE">Pendente</option>
                        <option value="PAGO">Pago</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Forma Pagamento</label>
                      <select value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                        <option value="">—</option>
                        <option value="PIX">PIX</option>
                        <option value="BOLETO">Boleto</option>
                        <option value="DEBITO_AUTOMATICO">Débito Automático</option>
                        <option value="CARTAO">Cartão</option>
                        <option value="DINHEIRO">Dinheiro</option>
                      </select>
                    </div>
                  </div>

                  {/* Observações */}
                  <textarea placeholder="Observações (opcional)" value={form.observacoes}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none resize-none" />

                  <button onClick={salvar}
                    className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-brand/20">
                    {editando ? "Salvar Alterações" : parseInt(form.totalParcelas) > 1 ? `Criar ${form.totalParcelas} Parcelas` : "Criar Lançamento"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
