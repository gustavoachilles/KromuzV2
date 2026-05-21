"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, X, Download, Search, ArrowUpRight, ArrowDownRight,
  DollarSign, Users, AlertTriangle, Eye, CreditCard
} from "lucide-react";
import Link from "next/link";

type Vendedor = {
  email: string; nome: string; creditos: number; debitos: number; saldo: number;
  pendentePagamento: number;
  dadosBancarios: { chavePix?: string; bancoNome?: string } | null;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CarteiraGerencialClient() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [form, setForm] = useState({
    vendedorEmail: "", vendedorNome: "", tipo: "DEBITO", categoria: "ESTORNO",
    descricao: "", valor: "", bancoNome: "", observacoes: "",
  });

  const fetchVendedores = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contabil/carteira");
      if (res.ok) setVendedores(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchVendedores(); }, []);

  const filtrados = vendedores.filter(v =>
    v.nome.toLowerCase().includes(busca.toLowerCase()) || v.email.toLowerCase().includes(busca.toLowerCase())
  );

  const totalSaldo = filtrados.reduce((s, v) => s + v.saldo, 0);
  const totalCreditos = filtrados.reduce((s, v) => s + v.creditos, 0);
  const totalDebitos = filtrados.reduce((s, v) => s + v.debitos, 0);
  const negativos = filtrados.filter(v => v.saldo < 0);

  const salvarTransacao = async () => {
    if (!form.vendedorEmail || !form.descricao || !form.valor) return;
    await fetch("/api/contabil/carteira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valor: parseFloat(form.valor) }),
    });
    setShowModal(false);
    fetchVendedores();
  };

  const exportarLote = async () => {
    setExportando(true);
    try {
      const res = await fetch("/api/contabil/carteira/exportar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        // Baixar CSV
        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `remessa_pix_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        alert(`Lote gerado! ${data.totalVendedores} vendedor(es), total: ${fmt(data.valorTotal)}`);
        fetchVendedores();
      }
    } catch { alert("Erro ao exportar"); }
    setExportando(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Wallet className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Motor de Repasses</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Carteira dos Vendedores</h1>
            <p className="text-zinc-500 text-sm mt-1">Saldo, créditos e débitos de cada corretor. Exporte o lote PIX com 1 clique.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <Plus className="h-4 w-4" /> Lançar Débito/Crédito
            </button>
            <button onClick={exportarLote} disabled={exportando}
              className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-brand/20 disabled:opacity-50">
              <Download className="h-4 w-4" /> {exportando ? "Gerando..." : "Exportar Lote PIX"}
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center"><Users className="h-5 w-5 text-brand" /></div>
            <div><p className="text-xs text-zinc-400 font-semibold">Vendedores</p><p className="text-lg font-bold text-zinc-900 dark:text-white">{vendedores.length}</p></div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            <div><p className="text-xs text-emerald-600 font-semibold">Total Créditos</p><p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalCreditos)}</p></div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
            <ArrowDownRight className="h-5 w-5 text-rose-600" />
            <div><p className="text-xs text-rose-600 font-semibold">Total Débitos</p><p className="text-lg font-bold text-rose-700 dark:text-rose-300">{fmt(totalDebitos)}</p></div>
          </div>
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${totalSaldo >= 0 ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'}`}>
            <DollarSign className="h-5 w-5 text-zinc-600" />
            <div><p className="text-xs text-zinc-400 font-semibold">Saldo a Pagar</p><p className={`text-lg font-bold ${totalSaldo >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700'}`}>{fmt(totalSaldo)}</p></div>
          </div>
        </div>

        {/* Alerta de saldos negativos */}
        {negativos.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="text-sm text-rose-700 dark:text-rose-300">
              <strong>{negativos.length} vendedor(es)</strong> com saldo negativo (devendo à empresa). Total: <strong>{fmt(negativos.reduce((s, v) => s + Math.abs(v.saldo), 0))}</strong>
            </p>
          </div>
        )}

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Buscar vendedor..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-brand/30 outline-none" />
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Wallet className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-400">Nenhuma transação de carteira registrada.</p>
            <p className="text-xs text-zinc-400 mt-1">Credite comissões da Esteira ou lance débitos manualmente.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                  <th className="text-left py-3 px-4 text-zinc-400 font-semibold">Vendedor</th>
                  <th className="text-right py-3 px-2 text-zinc-400 font-semibold">Créditos</th>
                  <th className="text-right py-3 px-2 text-zinc-400 font-semibold">Débitos</th>
                  <th className="text-right py-3 px-2 text-zinc-400 font-semibold">Saldo</th>
                  <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Chave PIX</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Extrato</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((v, i) => (
                  <motion.tr key={v.email} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
                          {v.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-white">{v.nome}</div>
                          <div className="text-xs text-zinc-400">{v.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-emerald-600">{fmt(v.creditos)}</td>
                    <td className="py-3 px-2 text-right font-bold text-rose-600">{fmt(v.debitos)}</td>
                    <td className={`py-3 px-2 text-right font-bold ${v.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {fmt(v.saldo)}
                    </td>
                    <td className="py-3 px-2 text-xs text-zinc-500 truncate max-w-[150px]">
                      {v.dadosBancarios?.chavePix || <span className="text-rose-400">Não cadastrada</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link href={`/contabil/carteira/${encodeURIComponent(v.email)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Lançar Débito/Crédito */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Lançar na Carteira</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {["CREDITO", "DEBITO"].map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                        className={`py-2 rounded-xl text-sm font-bold transition-all ${form.tipo === t
                          ? t === "CREDITO" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
                        {t === "CREDITO" ? "➕ Crédito" : "➖ Débito"}
                      </button>
                    ))}
                  </div>
                  <input type="email" placeholder="E-mail do vendedor" value={form.vendedorEmail}
                    onChange={e => setForm(f => ({ ...f, vendedorEmail: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <input type="text" placeholder="Nome do vendedor" value={form.vendedorNome}
                    onChange={e => setForm(f => ({ ...f, vendedorNome: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                    <option value="COMISSAO">Comissão</option>
                    <option value="ESTORNO">Estorno Bancário</option>
                    <option value="VALE">Vale / Adiantamento</option>
                    <option value="ADIANTAMENTO">Adiantamento</option>
                    <option value="DESCONTO_INSS">Desconto INSS</option>
                    <option value="MULTA">Multa</option>
                    <option value="AJUSTE">Ajuste Manual</option>
                  </select>
                  <input type="text" placeholder="Descrição (ex: Estorno Proposta #123)" value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <input type="number" step="0.01" placeholder="Valor (R$)" value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <textarea placeholder="Observações (opcional)" value={form.observacoes} rows={2}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none resize-none" />
                  <button onClick={salvarTransacao}
                    className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-brand/20">
                    Lançar Transação
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
