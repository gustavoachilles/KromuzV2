"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Plus, X, Loader2, Save } from "lucide-react";

type MetaRow = {
  id: string;
  vendedorEmail: string;
  vendedorNome: string | null;
  mes: number;
  ano: number;
  metaPropostas: number | null;
  metaVolume: number | null;
  metaLeads: number | null;
  metaComissao: number | null;
};

type Membro = { email: string; nome: string | null; perfilSlug: string };

const meses = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function MetasClient({
  metas: metasIniciais,
  equipe,
  mesAtual,
  anoAtual,
}: {
  metas: MetaRow[];
  equipe: Membro[];
  mesAtual: number;
  anoAtual: number;
}) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mesFiltro, setMesFiltro] = useState(mesAtual);
  const [form, setForm] = useState({
    vendedorEmail: "",
    mes: mesAtual,
    metaPropostas: "",
    metaVolume: "",
    metaLeads: "",
    metaComissao: "",
  });

  const metasFiltradas = metasIniciais.filter((m) => m.mes === mesFiltro);

  async function salvarMeta(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const membro = equipe.find((m) => m.email === form.vendedorEmail);

    const res = await fetch("/api/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendedorEmail: form.vendedorEmail,
        vendedorNome: membro?.nome || undefined,
        mes: form.mes,
        ano: anoAtual,
        metaPropostas: form.metaPropostas ? Number(form.metaPropostas) : undefined,
        metaVolume: form.metaVolume ? Number(form.metaVolume) : undefined,
        metaLeads: form.metaLeads ? Number(form.metaLeads) : undefined,
        metaComissao: form.metaComissao ? Number(form.metaComissao) : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setErro(data.error); setSalvando(false); return; }

    setModal(false);
    setSalvando(false);
    setForm({ vendedorEmail: "", mes: mesAtual, metaPropostas: "", metaVolume: "", metaLeads: "", metaComissao: "" });
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <Target className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Metas</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Metas {anoAtual}</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {metasFiltradas.length} meta{metasFiltradas.length !== 1 ? "s" : ""} definida{metasFiltradas.length !== 1 ? "s" : ""} para {meses[mesFiltro]}
            </p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:opacity-95 transition">
            <Plus className="h-4 w-4" /> Definir Meta
          </button>
        </header>

        {/* Filtro de mês */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button key={m} onClick={() => setMesFiltro(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                mesFiltro === m
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}>
              {meses[m]}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {metasFiltradas.length === 0 ? (
          <div className="text-center py-20">
            <Target className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhuma meta para {meses[mesFiltro]}</h3>
            <p className="text-sm text-zinc-400 mt-1">Clique em &quot;Definir Meta&quot; para começar.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs text-zinc-500 font-medium">Vendedor</th>
                  <th className="text-right px-5 py-3 text-xs text-zinc-500 font-medium">Propostas</th>
                  <th className="text-right px-5 py-3 text-xs text-zinc-500 font-medium">Volume (R$)</th>
                  <th className="text-right px-5 py-3 text-xs text-zinc-500 font-medium">Leads</th>
                  <th className="text-right px-5 py-3 text-xs text-zinc-500 font-medium">Comissão (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {metasFiltradas.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-3 font-medium">{m.vendedorNome || m.vendedorEmail}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{m.metaPropostas ?? "—"}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {m.metaVolume ? `R$ ${m.metaVolume.toLocaleString("pt-BR")}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{m.metaLeads ?? "—"}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {m.metaComissao ? `R$ ${m.metaComissao.toLocaleString("pt-BR")}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Definir Meta</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={salvarMeta} className="p-6 space-y-4">
              {erro && <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{erro}</div>}

              <div className="space-y-2">
                <label className="text-sm font-medium">Vendedor *</label>
                <select required value={form.vendedorEmail} onChange={(e) => setForm({ ...form, vendedorEmail: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="">Selecione...</option>
                  {equipe.map((m) => (
                    <option key={m.email} value={m.email}>{m.nome || m.email}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <select value={form.mes} onChange={(e) => setForm({ ...form, mes: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{meses[m]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Meta Propostas</label>
                  <input type="number" value={form.metaPropostas} onChange={(e) => setForm({ ...form, metaPropostas: e.target.value })} placeholder="10"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Meta Volume (R$)</label>
                  <input type="number" value={form.metaVolume} onChange={(e) => setForm({ ...form, metaVolume: e.target.value })} placeholder="50000"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Meta Leads</label>
                  <input type="number" value={form.metaLeads} onChange={(e) => setForm({ ...form, metaLeads: e.target.value })} placeholder="30"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Meta Comissão (R$)</label>
                  <input type="number" value={form.metaComissao} onChange={(e) => setForm({ ...form, metaComissao: e.target.value })} placeholder="5000"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:opacity-95 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {salvando ? "Salvando..." : "Salvar Meta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
