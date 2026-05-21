"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Edit3, Landmark, CreditCard, Wallet } from "lucide-react";

type Conta = {
  id: string; nomeBanco: string; agencia?: string; conta?: string;
  tipoConta: string; chavePix?: string; saldoInicial: number; cor?: string; ativo: boolean;
};

const CORES = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ContasBancariasClient() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [form, setForm] = useState({ nomeBanco: "", agencia: "", conta: "", tipoConta: "CORRENTE", chavePix: "", saldoInicial: "0", cor: CORES[0] });

  const fetchContas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contabil/contas-bancarias");
      if (res.ok) setContas(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchContas(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nomeBanco: "", agencia: "", conta: "", tipoConta: "CORRENTE", chavePix: "", saldoInicial: "0", cor: CORES[contas.length % CORES.length] });
    setShowModal(true);
  };

  const abrirEditar = (c: Conta) => {
    setEditando(c);
    setForm({ nomeBanco: c.nomeBanco, agencia: c.agencia || "", conta: c.conta || "", tipoConta: c.tipoConta, chavePix: c.chavePix || "", saldoInicial: String(c.saldoInicial), cor: c.cor || CORES[0] });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nomeBanco) return;
    const payload = { ...form, saldoInicial: parseFloat(form.saldoInicial) || 0 };
    if (editando) {
      await fetch("/api/contabil/contas-bancarias", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editando.id, ...payload }) });
    } else {
      await fetch("/api/contabil/contas-bancarias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowModal(false);
    fetchContas();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta conta bancária?")) return;
    const res = await fetch(`/api/contabil/contas-bancarias?id=${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    fetchContas();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Landmark className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Financeiro</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Contas Bancárias</h1>
            <p className="text-zinc-500 text-sm mt-1">Cadastre as contas PJ da empresa para vincular aos lançamentos financeiros.</p>
          </div>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-brand/20">
            <Plus className="h-4 w-4" /> Nova Conta
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
        ) : contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Wallet className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-400">Nenhuma conta bancária cadastrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {contas.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm relative group overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl" style={{ backgroundColor: c.cor || CORES[i % CORES.length] }} />
                <div className="flex items-center justify-between mb-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: c.cor || CORES[i % CORES.length] }}>
                      {c.nomeBanco.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-white">{c.nomeBanco}</h3>
                      <p className="text-xs text-zinc-400">{c.tipoConta === "CORRENTE" ? "Conta Corrente" : c.tipoConta === "POUPANCA" ? "Poupança" : "Conta de Pagamento"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => excluir(c.id)} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {c.agencia && <div className="flex justify-between"><span className="text-zinc-400">Agência</span><span className="text-zinc-700 dark:text-zinc-300 font-medium">{c.agencia}</span></div>}
                  {c.conta && <div className="flex justify-between"><span className="text-zinc-400">Conta</span><span className="text-zinc-700 dark:text-zinc-300 font-medium">{c.conta}</span></div>}
                  {c.chavePix && <div className="flex justify-between"><span className="text-zinc-400">Chave PIX</span><span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[150px]">{c.chavePix}</span></div>}
                  <div className="flex justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400">Saldo Inicial</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{fmt(c.saldoInicial)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{editando ? "Editar Conta" : "Nova Conta Bancária"}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <input type="text" placeholder="Nome do Banco (ex: Itaú PJ)" value={form.nomeBanco}
                    onChange={e => setForm(f => ({ ...f, nomeBanco: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Agência" value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <input type="text" placeholder="Conta" value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  </div>
                  <select value={form.tipoConta} onChange={e => setForm(f => ({ ...f, tipoConta: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                    <option value="PAGAMENTO">Conta de Pagamento</option>
                  </select>
                  <input type="text" placeholder="Chave PIX" value={form.chavePix} onChange={e => setForm(f => ({ ...f, chavePix: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Saldo Inicial (R$)</label>
                    <input type="number" step="0.01" value={form.saldoInicial} onChange={e => setForm(f => ({ ...f, saldoInicial: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Cor de Identificação</label>
                    <div className="flex gap-2">
                      {CORES.map(cor => (
                        <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${form.cor === cor ? 'border-white ring-2 ring-brand scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: cor }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={salvar} className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-brand/20">
                    {editando ? "Salvar" : "Criar Conta"}
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
