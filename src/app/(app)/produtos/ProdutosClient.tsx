"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  X,
  Loader2,
  Building2,
  Shield,
  Calculator,
  BookOpen,
  Search,
} from "lucide-react";

type Produto = {
  id: string;
  nomeProduto: string;
  tipoProduto: string;
  prazoMaximo: number | null;
  taxaMedia: number | null;
  observacoes: string | null;
  banco: { id: string; nome: string };
  convenio: { id: string; nome: string } | null;
  _count: { tabelasCoeficiente: number; regras: number };
};

type BancoOpt = { id: string; nome: string };
type ConvenioOpt = { id: string; nome: string };

const tipoLabel: Record<string, { label: string; color: string }> = {
  EMPRESTIMO_CONSIGNADO: { label: "Margem Nova", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  REFINANCIAMENTO: { label: "Refinanciamento", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  PORTABILIDADE: { label: "Portabilidade", color: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" },
  PORTABILIDADE_REFIN: { label: "Port + Refin", color: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" },
  CARTAO_CONSIGNADO: { label: "Cartão Consig.", color: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" },
  CARTAO_BENEFICIO: { label: "Cartão Benefício", color: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" },
};

export function ProdutosClient({
  produtos: produtosIniciais,
  bancos,
  convenios,
}: {
  produtos: Produto[];
  bancos: BancoOpt[];
  convenios: ConvenioOpt[];
}) {
  const router = useRouter();
  const [produtos] = useState(produtosIniciais);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [bancosLista, setBancosLista] = useState(bancos);
  const [criarBancoInline, setCriarBancoInline] = useState(false);
  const [novoBancoNome, setNovoBancoNome] = useState("");
  const [salvandoBanco, setSalvandoBanco] = useState(false);
  const [form, setForm] = useState({
    bancoId: "",
    convenioId: "",
    nomeProduto: "",
    tipoProduto: "EMPRESTIMO_CONSIGNADO",
    prazoMaximo: "",
    taxaMedia: "",
    observacoes: "",
  });

  const filtrados = produtos.filter((p) => {
    if (busca && !p.nomeProduto.toLowerCase().includes(busca.toLowerCase()) && !p.banco.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroBanco && p.banco.id !== filtroBanco) return false;
    if (filtroTipo && p.tipoProduto !== filtroTipo) return false;
    return true;
  });

  async function criarProduto(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const res = await fetch("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bancoId: form.bancoId,
        convenioId: form.convenioId || null,
        nomeProduto: form.nomeProduto,
        tipoProduto: form.tipoProduto,
        prazoMaximo: form.prazoMaximo ? Number(form.prazoMaximo) : undefined,
        taxaMedia: form.taxaMedia ? Number(form.taxaMedia) : undefined,
        observacoes: form.observacoes || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErro(data.error);
      setSalvando(false);
      return;
    }

    setModal(false);
    setSalvando(false);
    setForm({ bancoId: "", convenioId: "", nomeProduto: "", tipoProduto: "EMPRESTIMO_CONSIGNADO", prazoMaximo: "", taxaMedia: "", observacoes: "" });
    router.refresh();
  }

  async function criarBancoInlineHandler() {
    if (!novoBancoNome.trim()) return;
    setSalvandoBanco(true);
    const res = await fetch("/api/bancos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoBancoNome.trim(), tipoBanco: "consignado" }),
    });
    const data = await res.json();
    if (res.ok) {
      setBancosLista(prev => [...prev, { id: data.id, nome: data.nome }].sort((a, b) => a.nome.localeCompare(b.nome)));
      setForm(prev => ({ ...prev, bancoId: data.id }));
      setCriarBancoInline(false);
      setNovoBancoNome("");
    } else {
      setErro(data.error || "Erro ao criar banco");
    }
    setSalvandoBanco(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Package className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Produtos de Crédito</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Produtos</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {produtos.length} produto{produtos.length !== 1 ? "s" : ""} · {filtrados.length} exibido{filtrados.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" /> Novo Produto
          </button>
        </header>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto ou banco..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>
          <select
            value={filtroBanco}
            onChange={(e) => setFiltroBanco(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          >
            <option value="">Todos os bancos</option>
            {bancos.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(tipoLabel).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhum produto encontrado</h3>
            <p className="text-sm text-zinc-400 mt-1">Ajuste os filtros ou crie um novo produto.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Produto</th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Banco</th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Convênio</th>
                  <th className="text-center px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Tabelas</th>
                  <th className="text-center px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Regras</th>
                  <th className="text-center px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Prazo</th>
                  <th className="text-center px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => {
                  const tipo = tipoLabel[p.tipoProduto] || { label: p.tipoProduto, color: "bg-zinc-100 text-zinc-600" };
                  return (
                    <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{p.nomeProduto}</p>
                        {p.observacoes && <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">{p.observacoes}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-brand" />
                          {p.banco.nome}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tipo.color}`}>
                          {tipo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-500">
                        {p.convenio ? (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-amber-500" />
                            {p.convenio.nome}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="flex items-center justify-center gap-1 text-xs">
                          <Calculator className="h-3 w-3 text-zinc-400" />
                          {p._count.tabelasCoeficiente}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="flex items-center justify-center gap-1 text-xs">
                          <BookOpen className="h-3 w-3 text-zinc-400" />
                          {p._count.regras}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-xs tabular-nums font-medium">
                        {p.prazoMaximo ? `${p.prazoMaximo}m` : "—"}
                      </td>
                      <td className="px-5 py-4 text-center text-xs tabular-nums font-medium">
                        {p.taxaMedia ? `${p.taxaMedia.toFixed(2)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Produto */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Novo Produto de Crédito</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={criarProduto} className="p-6 space-y-4">
              {erro && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {erro}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Produto *</label>
                <input
                  required
                  value={form.nomeProduto}
                  onChange={(e) => setForm({ ...form, nomeProduto: e.target.value })}
                  placeholder="Ex: Margem Livre INSS"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <label className="text-sm font-medium">Banco *</label>
                  <select
                    required={!criarBancoInline}
                    value={form.bancoId}
                    onChange={(e) => setForm({ ...form, bancoId: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    <option value="">Selecione...</option>
                    {bancosLista.map((b) => (
                      <option key={b.id} value={b.id}>{b.nome}</option>
                    ))}
                  </select>
                  {!criarBancoInline ? (
                    <button
                      type="button"
                      onClick={() => setCriarBancoInline(true)}
                      className="flex items-center gap-1 text-xs text-brand hover:underline mt-1"
                    >
                      <Plus className="h-3 w-3" /> Novo Banco
                    </button>
                  ) : (
                    <div className="flex gap-2 mt-1">
                      <input
                        autoFocus
                        value={novoBancoNome}
                        onChange={(e) => setNovoBancoNome(e.target.value)}
                        placeholder="Nome do banco"
                        className="flex-1 rounded-lg border border-brand/50 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/50"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), criarBancoInlineHandler())}
                      />
                      <button
                        type="button"
                        onClick={criarBancoInlineHandler}
                        disabled={salvandoBanco}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {salvandoBanco ? <Loader2 className="h-3 w-3 animate-spin" /> : "Criar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCriarBancoInline(false); setNovoBancoNome(""); }}
                        className="text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo *</label>
                  <select
                    value={form.tipoProduto}
                    onChange={(e) => setForm({ ...form, tipoProduto: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    {Object.entries(tipoLabel).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Convênio</label>
                  <select
                    value={form.convenioId}
                    onChange={(e) => setForm({ ...form, convenioId: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    <option value="">Nenhum</option>
                    {convenios.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Prazo Max</label>
                  <input
                    type="number"
                    value={form.prazoMaximo}
                    onChange={(e) => setForm({ ...form, prazoMaximo: e.target.value })}
                    placeholder="84"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Taxa %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.taxaMedia}
                    onChange={(e) => setForm({ ...form, taxaMedia: e.target.value })}
                    placeholder="1.80"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition"
                >
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {salvando ? "Criando..." : "Criar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
