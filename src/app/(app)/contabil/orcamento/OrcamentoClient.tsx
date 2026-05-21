"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, ChevronLeft, ChevronRight, Save, AlertTriangle, Lock, Unlock } from "lucide-react";

type Categoria = { id: string; nome: string; tipo: string; grupo: string | null };
type Orcamento = {
  id: string; categoriaId: string; mes: number; ano: number;
  valorLimite: number; alertaPercentual: number; travaBloqueio: boolean;
  categoria: { id: string; nome: string };
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrcamentoClient() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<Record<string, { valorLimite: string; alertaPercentual: string; travaBloqueio: boolean }>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resC, resO] = await Promise.all([
        fetch("/api/contabil/categorias"),
        fetch(`/api/contabil/orcamentos?mes=${mes}&ano=${ano}`),
      ]);
      if (resC.ok) {
        const cats = await resC.json();
        setCategorias(cats.filter((c: Categoria) => c.tipo === "DESPESA"));
      }
      if (resO.ok) {
        const orcs = await resO.json();
        setOrcamentos(orcs);
        const forms: Record<string, any> = {};
        orcs.forEach((o: Orcamento) => {
          forms[o.categoriaId] = { valorLimite: String(o.valorLimite), alertaPercentual: String(o.alertaPercentual), travaBloqueio: o.travaBloqueio };
        });
        setEditForm(forms);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const prevMonth = () => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); };
  const nextMonth = () => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); };

  const salvar = async (categoriaId: string) => {
    const f = editForm[categoriaId];
    if (!f || !f.valorLimite) return;
    setSalvando(categoriaId);
    await fetch("/api/contabil/orcamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoriaId, mes, ano,
        valorLimite: parseFloat(f.valorLimite),
        alertaPercentual: parseFloat(f.alertaPercentual) || 80,
        travaBloqueio: f.travaBloqueio,
      }),
    });
    setSalvando(null);
    fetchAll();
  };

  const updateForm = (catId: string, field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [catId]: { ...(prev[catId] || { valorLimite: "", alertaPercentual: "80", travaBloqueio: false }), [field]: value },
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Shield className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Budget Control</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Orçamento de Guerra</h1>
            <p className="text-zinc-500 text-sm mt-1">Defina limites mensais de gasto por categoria. Ao estourar, o sistema bloqueia ou alerta.</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 shadow-sm">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronLeft className="h-4 w-4 text-zinc-500" /></button>
            <span className="font-bold text-zinc-900 dark:text-white min-w-[140px] text-center text-sm">{MESES[mes - 1]} {ano}</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><ChevronRight className="h-4 w-4 text-zinc-500" /></button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
        ) : categorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <AlertTriangle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-400">Nenhuma categoria de despesa cadastrada. Crie categorias primeiro.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                  <th className="text-left py-3 px-4 text-zinc-400 font-semibold">Categoria</th>
                  <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Grupo</th>
                  <th className="text-right py-3 px-2 text-zinc-400 font-semibold">Limite Mensal (R$)</th>
                  <th className="text-right py-3 px-2 text-zinc-400 font-semibold">Alerta (%)</th>
                  <th className="text-center py-3 px-2 text-zinc-400 font-semibold">Bloqueio</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat, i) => {
                  const f = editForm[cat.id] || { valorLimite: "", alertaPercentual: "80", travaBloqueio: false };
                  const hasOrc = orcamentos.some(o => o.categoriaId === cat.id);
                  return (
                    <motion.tr key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">{cat.nome}</td>
                      <td className="py-3 px-2 text-zinc-500">{cat.grupo || "—"}</td>
                      <td className="py-3 px-2 text-right">
                        <input type="number" step="100" value={f.valorLimite} onChange={e => updateForm(cat.id, "valorLimite", e.target.value)}
                          placeholder="0,00" className="w-32 text-right px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <input type="number" min="1" max="100" value={f.alertaPercentual} onChange={e => updateForm(cat.id, "alertaPercentual", e.target.value)}
                          className="w-20 text-right px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button onClick={() => updateForm(cat.id, "travaBloqueio", !f.travaBloqueio)}
                          className={`p-2 rounded-lg transition-colors ${f.travaBloqueio ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                          {f.travaBloqueio ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => salvar(cat.id)} disabled={salvando === cat.id}
                          className="flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                          <Save className="h-3.5 w-3.5" /> {salvando === cat.id ? "..." : hasOrc ? "Atualizar" : "Salvar"}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
