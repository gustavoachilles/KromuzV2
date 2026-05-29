"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, Edit2, Trash2, Eye, EyeOff, Image, Loader2, Table2, Power,
  ChevronUp, ChevronDown, X, Upload, Sparkles, CheckCircle, AlertTriangle, Info,
  FileSpreadsheet, ArrowUpDown, DollarSign,
} from "lucide-react";
import { toast } from "sonner";

// ── Tipos ──
type Banco = { id: string; nome: string };
type Convenio = { id: string; nome: string };
type Produto = { id: string; nomeProduto: string; tipoProduto: string };
type Tabela = {
  id: string; nome: string; prazo: number; taxaJurosMensal: number;
  coeficiente: number; comissaoFlatPct: number | null; comissaoRepassePct: number | null;
  ativo: boolean; banco: Banco; produto: Produto; convenio: Convenio | null;
};

// ── Helpers ──
function parseBR(v: string | number | null | undefined): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}
function maskDecimalBR(v: string): string {
  let s = String(v).replace(".", ",").replace(/[^0-9,]/g, "");
  const parts = s.split(",");
  if (parts.length > 2) s = parts[0] + "," + parts.slice(1).join("");
  if (parts.length === 2) s = parts[0] + "," + parts[1].slice(0, 4);
  return s;
}

// ── Form vazio ──
const FORM_VAZIO = {
  nome: "", bancoId: "", produtoId: "", convenioId: "",
  prazo: "84", taxaJurosMensal: "", coeficiente: "",
  comissaoFlatPct: "", comissaoRepassePct: "", ativo: true,
};

const inputCls = "w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition";
const selectCls = inputCls;

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export function TabelasComissaoClient() {
  // ── State ──
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("todos");
  const [filtroProduto, setFiltroProduto] = useState("todos");
  const [filtroConvenio, setFiltroConvenio] = useState("todos");
  const [filtroPrazo, setFiltroPrazo] = useState("todos");
  const [filtroComissaoMin, setFiltroComissaoMin] = useState("");
  const [filtroComissaoMax, setFiltroComissaoMax] = useState("");

  // Ordenação
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Tabela | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // Importar Imagem
  const [showImagem, setShowImagem] = useState(false);

  // ── Load data ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, bRes, pRes, cRes] = await Promise.all([
        fetch("/api/tabelas-comissao"),
        fetch("/api/bancos"),
        fetch("/api/produtos"),
        fetch("/api/convenios"),
      ]);
      if (tRes.ok) setTabelas(await tRes.json());
      if (bRes.ok) setBancos(await bRes.json());
      if (pRes.ok) setProdutos(await pRes.json());
      if (cRes.ok) setConvenios(await cRes.json());
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtros dinâmicos ──
  const bancosUnicos = useMemo(() => [...new Set(tabelas.map(t => t.banco?.nome).filter(Boolean))].sort(), [tabelas]);
  const conveniosUnicos = useMemo(() => {
    let f = tabelas;
    if (filtroBanco !== "todos") f = f.filter(t => t.banco?.nome === filtroBanco);
    return [...new Set(f.map(t => t.convenio?.nome).filter(Boolean))].sort();
  }, [tabelas, filtroBanco]);
  const produtosUnicos = useMemo(() => {
    let f = tabelas;
    if (filtroBanco !== "todos") f = f.filter(t => t.banco?.nome === filtroBanco);
    if (filtroConvenio !== "todos") f = f.filter(t => t.convenio?.nome === filtroConvenio);
    return [...new Set(f.map(t => t.produto?.tipoProduto).filter(Boolean))].sort();
  }, [tabelas, filtroBanco, filtroConvenio]);
  const prazosUnicos = useMemo(() => [...new Set(tabelas.map(t => t.prazo).filter(Boolean))].sort((a, b) => a - b), [tabelas]);

  // ── Aplicar filtros ──
  const filtered = useMemo(() => {
    let r = tabelas;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(t =>
        [t.nome, t.banco?.nome, t.produto?.nomeProduto, t.convenio?.nome]
          .some(v => v?.toLowerCase().includes(s))
      );
    }
    if (filtroBanco !== "todos") r = r.filter(t => t.banco?.nome === filtroBanco);
    if (filtroProduto !== "todos") r = r.filter(t => t.produto?.tipoProduto === filtroProduto);
    if (filtroConvenio !== "todos") r = r.filter(t => t.convenio?.nome === filtroConvenio);
    if (filtroPrazo !== "todos") r = r.filter(t => t.prazo === parseInt(filtroPrazo));
    const cMin = filtroComissaoMin ? parseFloat(filtroComissaoMin) : -Infinity;
    const cMax = filtroComissaoMax ? parseFloat(filtroComissaoMax) : Infinity;
    r = r.filter(t => {
      const c = t.comissaoFlatPct ?? 0;
      return c >= cMin && c <= cMax;
    });
    // Ordenação
    if (sortField && sortDir) {
      r = [...r].sort((a, b) => {
        let va: any, vb: any;
        switch (sortField) {
          case "nome": va = a.nome?.toLowerCase(); vb = b.nome?.toLowerCase(); break;
          case "banco": va = a.banco?.nome?.toLowerCase(); vb = b.banco?.nome?.toLowerCase(); break;
          case "produto": va = a.produto?.tipoProduto?.toLowerCase(); vb = b.produto?.tipoProduto?.toLowerCase(); break;
          case "taxa": va = a.taxaJurosMensal; vb = b.taxaJurosMensal; break;
          case "prazo": va = a.prazo; vb = b.prazo; break;
          case "comissao": va = a.comissaoFlatPct ?? 0; vb = b.comissaoFlatPct ?? 0; break;
          default: return 0;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return r;
  }, [tabelas, search, filtroBanco, filtroProduto, filtroConvenio, filtroPrazo, filtroComissaoMin, filtroComissaoMax, sortField, sortDir]);

  // ── Sort toggle ──
  const toggleSort = (field: string) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir(null); }
    } else { setSortField(field); setSortDir("asc"); }
  };
  const sortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  // ── CRUD handlers ──
  const abrirForm = (tabela?: Tabela) => {
    if (tabela) {
      setEditando(tabela);
      setForm({
        nome: tabela.nome,
        bancoId: tabela.banco?.id || "",
        produtoId: tabela.produto?.id || "",
        convenioId: tabela.convenio?.id || "",
        prazo: String(tabela.prazo),
        taxaJurosMensal: String(tabela.taxaJurosMensal).replace(".", ","),
        coeficiente: String(tabela.coeficiente),
        comissaoFlatPct: tabela.comissaoFlatPct != null ? String(tabela.comissaoFlatPct).replace(".", ",") : "",
        comissaoRepassePct: tabela.comissaoRepassePct != null ? String(tabela.comissaoRepassePct).replace(".", ",") : "",
        ativo: tabela.ativo !== false,
      });
    } else {
      setEditando(null);
      setForm(FORM_VAZIO);
    }
    setShowForm(true);
  };

  const handleSalvar = async () => {
    if (!form.nome?.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.bancoId) { toast.error("Selecione o banco"); return; }
    if (!form.produtoId) { toast.error("Selecione o produto"); return; }
    setSalvando(true);

    const payload = {
      id: editando?.id,
      nome: form.nome.trim(),
      bancoId: form.bancoId,
      produtoId: form.produtoId,
      convenioId: form.convenioId || null,
      prazo: parseInt(form.prazo) || 84,
      taxaJurosMensal: parseBR(form.taxaJurosMensal) || 0,
      coeficiente: parseBR(form.coeficiente) || 0,
      comissaoFlatPct: parseBR(form.comissaoFlatPct),
      comissaoRepassePct: parseBR(form.comissaoRepassePct),
      ativo: form.ativo,
    };

    const res = await fetch("/api/tabelas-comissao", {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSalvando(false);
    if (res.ok) {
      toast.success(editando ? "Tabela atualizada!" : "Tabela criada!");
      setShowForm(false); setEditando(null); load();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta tabela de comissão?")) return;
    const res = await fetch(`/api/tabelas-comissao?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Excluída!"); load(); }
    else toast.error("Erro ao excluir");
  };

  const toggleAtivo = async (t: Tabela) => {
    await fetch("/api/tabelas-comissao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, ativo: !t.ativo }),
    });
    load();
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-brand font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Tabelas de Comissão
          </p>
          <h1 className="text-2xl font-bold mt-1">Gerenciar Tabelas</h1>
          <p className="text-sm text-zinc-400 mt-1">Cadastre, importe e visualize as tabelas de comissão por banco e produto.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImagem(true)} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/60 transition">
            <Image className="h-4 w-4" /> Importar Imagem
          </button>
          <button onClick={() => abrirForm()} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Nova Tabela
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input placeholder="Buscar tabela, banco..." className={inputCls + " pl-9"} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filtroBanco} onChange={e => { setFiltroBanco(e.target.value); setFiltroConvenio("todos"); setFiltroProduto("todos"); }} className={selectCls + " w-36"}>
          <option value="todos">Bancos</option>
          {bancosUnicos.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filtroConvenio} onChange={e => { setFiltroConvenio(e.target.value); setFiltroProduto("todos"); }} className={selectCls + " w-36"}>
          <option value="todos">Convênios</option>
          {conveniosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} className={selectCls + " w-40"}>
          <option value="todos">Produtos</option>
          {produtosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroPrazo} onChange={e => setFiltroPrazo(e.target.value)} className={selectCls + " w-28"}>
          <option value="todos">Prazo</option>
          {prazosUnicos.map(p => <option key={p} value={String(p)}>{p}x</option>)}
        </select>
        <div className="flex gap-2">
          <div>
            <label className="text-[10px] text-zinc-500">Com. Min%</label>
            <input type="number" step="0.01" placeholder="Min" value={filtroComissaoMin} onChange={e => setFiltroComissaoMin(e.target.value)} className={inputCls + " w-20 h-9"} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">Com. Max%</label>
            <input type="number" step="0.01" placeholder="Max" value={filtroComissaoMax} onChange={e => setFiltroComissaoMax(e.target.value)} className={inputCls + " w-20 h-9"} />
          </div>
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-zinc-500">{filtered.length} tabela(s) encontrada(s)</p>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 border border-zinc-800 rounded-xl bg-zinc-900/40">
          <Table2 className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Nenhuma tabela encontrada</p>
          <p className="text-sm mt-1">Clique em "Nova Tabela" ou "Importar Imagem" para começar</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/40">
                  {[
                    { key: "nome", label: "Nome" },
                    { key: "banco", label: "Banco" },
                    { key: "produto", label: "Produto" },
                    { key: "taxa", label: "Taxa" },
                    { key: "prazo", label: "Prazo" },
                    { key: "comissao", label: "Comissão" },
                  ].map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="text-left px-4 py-3 font-medium text-zinc-400 cursor-pointer hover:text-white transition select-none text-xs uppercase tracking-wide">
                      {col.label}{sortIcon(col.key)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide text-center">Status</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition ${!t.ativo ? "opacity-40" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{t.nome || "—"}</p>
                      {t.convenio?.nome && <p className="text-[10px] text-zinc-500">{t.convenio.nome}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-300">{t.banco?.nome || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">{t.produto?.tipoProduto || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-medium">{t.taxaJurosMensal}%</td>
                    <td className="px-4 py-3 text-zinc-400">{t.prazo}x</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-emerald-400 text-base">{(t.comissaoFlatPct ?? 0).toFixed(2)}%</span>
                      {t.comissaoRepassePct != null && <p className="text-[10px] text-zinc-500">Repasse: {t.comissaoRepassePct}%</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleAtivo(t)}>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.ativo ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-700/40 text-zinc-500 border border-zinc-600/30"}`}>
                          {t.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => abrirForm(t)} className="p-1.5 rounded-lg hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Nova/Editar Tabela ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold">{editando ? "Editar Tabela" : "Nova Tabela de Comissão"}</h2>
              <button onClick={() => { setShowForm(false); setEditando(null); }} className="text-zinc-400 hover:text-white transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Identificação */}
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Identificação</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Nome da Tabela *</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: BMG INSS Margem Julho/25" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Banco *</label>
                  <select value={form.bancoId} onChange={e => setForm({ ...form, bancoId: e.target.value })} className={selectCls}>
                    <option value="">Selecione...</option>
                    {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Produto *</label>
                  <select value={form.produtoId} onChange={e => setForm({ ...form, produtoId: e.target.value })} className={selectCls}>
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nomeProduto}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Convênio</label>
                  <select value={form.convenioId} onChange={e => setForm({ ...form, convenioId: e.target.value })} className={selectCls}>
                    <option value="">Nenhum</option>
                    {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Condições */}
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Condições</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Taxa a.m. (%) *</label>
                  <input value={form.taxaJurosMensal} onChange={e => setForm({ ...form, taxaJurosMensal: maskDecimalBR(e.target.value) })} placeholder="1,850" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Prazo (meses)</label>
                  <input type="number" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Coeficiente</label>
                  <input value={form.coeficiente} onChange={e => setForm({ ...form, coeficiente: e.target.value })} placeholder="0.022340" className={inputCls} />
                </div>
              </div>

              {/* Comissão */}
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Comissão</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Comissão Flat (%)</label>
                  <input value={form.comissaoFlatPct} onChange={e => setForm({ ...form, comissaoFlatPct: maskDecimalBR(e.target.value) })} placeholder="8,00" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">Comissão Repasse (%)</label>
                  <input value={form.comissaoRepassePct} onChange={e => setForm({ ...form, comissaoRepassePct: maskDecimalBR(e.target.value) })} placeholder="Opcional" className={inputCls} />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="rounded" />
                <label htmlFor="ativo" className="text-sm text-zinc-300 cursor-pointer">Tabela ativa no sistema</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-zinc-800">
              <button onClick={() => { setShowForm(false); setEditando(null); }} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando} className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition">
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {salvando ? "Salvando..." : editando ? "Atualizar" : "Criar Tabela"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Importar Imagem ── */}
      {showImagem && (
        <ImportarTabelaImagemModal
          bancos={bancos}
          produtos={produtos}
          convenios={convenios}
          onClose={() => setShowImagem(false)}
          onImportado={() => { load(); setShowImagem(false); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL: IMPORTAR TABELA POR IMAGEM
// ══════════════════════════════════════════════════════════════
function ImportarTabelaImagemModal({ bancos, produtos, convenios, onClose, onImportado }: {
  bancos: Banco[]; produtos: Produto[]; convenios: Convenio[];
  onClose: () => void; onImportado: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [dados, setDados] = useState<any>(null);
  const [editados, setEditados] = useState<any[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [steps, setSteps] = useState<{ label: string; status: "ok" | "loading" | "skip" }[]>([]);

  // Contexto global
  const [ctxBancoId, setCtxBancoId] = useState("");
  const [ctxProdutoId, setCtxProdutoId] = useState("");
  const [ctxConvenioId, setCtxConvenioId] = useState("");

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setPreview(URL.createObjectURL(file));
    setDados(null);
    setEditados([]);
  };

  const processar = async () => {
    if (!arquivo) return;
    setProcessando(true);
    setSteps([{ label: "Lendo imagem com IA...", status: "loading" }]);

    try {
      // Converter para base64
      const buffer = await arquivo.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      const res = await fetch("/api/tabelas-comissao/extrair-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: arquivo.type }),
      });

      const result = await res.json();

      if (result.success && result.dados) {
        const d = result.dados;
        setDados(d);

        const newSteps: typeof steps = [{ label: "Imagem processada pela IA", status: "ok" }];

        // Auto-detectar banco
        if (d.banco) {
          const bancoMatch = bancos.find(b => b.nome.toLowerCase().includes(d.banco.toLowerCase()) || d.banco.toLowerCase().includes(b.nome.toLowerCase()));
          if (bancoMatch) {
            setCtxBancoId(bancoMatch.id);
            newSteps.push({ label: `Banco: ${bancoMatch.nome}`, status: "ok" });
          } else {
            newSteps.push({ label: `Banco "${d.banco}" não encontrado — selecione`, status: "skip" });
          }
        }

        // Auto-detectar convênio
        if (d.convenio) {
          const convMatch = convenios.find(c => c.nome.toLowerCase().includes(d.convenio.toLowerCase()));
          if (convMatch) {
            setCtxConvenioId(convMatch.id);
            newSteps.push({ label: `Convênio: ${convMatch.nome}`, status: "ok" });
          } else {
            newSteps.push({ label: `Convênio "${d.convenio}" não encontrado`, status: "skip" });
          }
        }

        // Auto-detectar produto
        if (d.produto) {
          const prodMatch = produtos.find(p => p.tipoProduto.toLowerCase().includes(d.produto.toLowerCase()) || d.produto.toLowerCase().includes(p.tipoProduto.toLowerCase()));
          if (prodMatch) {
            setCtxProdutoId(prodMatch.id);
            newSteps.push({ label: `Produto: ${prodMatch.nomeProduto}`, status: "ok" });
          } else {
            newSteps.push({ label: `Produto "${d.produto}" — selecione`, status: "skip" });
          }
        }

        newSteps.push({ label: `${d.itens.length} linha(s) extraídas · confiança ${d.confianca || 0}%`, status: "ok" });
        setSteps(newSteps);

        const normalizado = d.itens.map((item: any) => ({
          tabela: item.tabela || "",
          taxa_juros: item.taxa_juros ?? "",
          prazo_maximo: item.prazo_maximo ?? item.prazo ?? "",
          percentual_comissao: item.percentual_comissao ?? item.comissao ?? "",
          coeficiente: item.coeficiente ?? "",
          codigo_tabela: item.codigo_tabela ?? "",
        }));

        setEditados(normalizado);
        setSelecionadas(new Set(normalizado.map((_: any, i: number) => i)));
        toast.success(`${normalizado.length} linha(s) extraída(s)`);
      } else {
        toast.error("Não foi possível extrair dados da imagem");
        setSteps([{ label: result.error || "Erro na extração", status: "skip" }]);
      }
    } catch (e: any) {
      toast.error("Erro ao processar imagem");
      setSteps([{ label: e.message, status: "skip" }]);
    }
    setProcessando(false);
  };

  const handleSalvar = async () => {
    if (!ctxBancoId) { toast.error("Selecione o banco"); return; }
    if (!ctxProdutoId) { toast.error("Selecione o produto"); return; }
    if (selecionadas.size === 0) { toast.error("Selecione ao menos uma linha"); return; }

    setSalvando(true);
    const items = [...selecionadas].map(i => {
      const item = editados[i];
      return {
        bancoId: ctxBancoId,
        produtoId: ctxProdutoId,
        convenioId: ctxConvenioId || null,
        nome: item.tabela,
        prazo: parseInt(item.prazo_maximo) || 84,
        taxaJurosMensal: parseBR(item.taxa_juros) || 0,
        coeficiente: parseBR(item.coeficiente) || 0,
        comissaoFlatPct: parseBR(item.percentual_comissao),
        comissaoRepassePct: null,
        ativo: true,
      };
    });

    const res = await fetch("/api/tabelas-comissao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });

    setSalvando(false);
    if (res.ok) {
      const r = await res.json();
      toast.success(`${r.criadas} criada(s), ${r.atualizadas} atualizada(s)`);
      if (r.erros?.length) toast.error(`${r.erros.length} erro(s)`);
      onImportado();
    } else {
      toast.error("Erro ao salvar");
    }
  };

  const toggleLinha = (i: number) => setSelecionadas(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });
  const toggleTodos = () => setSelecionadas(editados.length === selecionadas.size ? new Set() : new Set(editados.map((_, i) => i)));

  const updateItem = (i: number, campo: string, valor: string) =>
    setEditados(prev => prev.map((item, idx) => idx === i ? { ...item, [campo]: valor } : item));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Image className="h-5 w-5 text-brand" /> Importar Tabela por Imagem</h2>
            <p className="text-sm text-zinc-400 mt-1">Faça upload de uma foto ou print da tabela. A IA extrai os dados — você só confirma.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Upload */}
          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center hover:border-brand/50 transition">
            <input type="file" accept="image/*" onChange={handleArquivo} className="hidden" id="img-tabela" />
            <label htmlFor="img-tabela" className="cursor-pointer block">
              {preview ? (
                <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-2" />
                  <p className="text-sm text-zinc-400">Clique para selecionar imagem (foto, print, etc.)</p>
                </>
              )}
            </label>
            {arquivo && <p className="mt-1 text-xs text-emerald-400">✓ {arquivo.name}</p>}
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 space-y-1.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {step.status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand shrink-0" />}
                  {step.status === "ok" && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  {step.status === "skip" && <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                  <span className={step.status === "ok" ? "text-emerald-300" : step.status === "loading" ? "text-zinc-300 font-medium" : "text-amber-300"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Botão processar */}
          {arquivo && !dados && (
            <button onClick={processar} disabled={processando} className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {processando ? "Extraindo dados com IA..." : "Extrair Dados com IA"}
            </button>
          )}

          {/* Contexto global */}
          {editados.length > 0 && (
            <div className="rounded-xl border-2 border-brand/20 bg-brand/5 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-brand" />
                <span className="font-semibold text-sm text-brand">Contexto Global — aplicado em todas as linhas</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Banco *</label>
                  <select value={ctxBancoId} onChange={e => setCtxBancoId(e.target.value)} className={selectCls + " h-9 text-xs"}>
                    <option value="">Selecionar</option>
                    {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Produto *</label>
                  <select value={ctxProdutoId} onChange={e => setCtxProdutoId(e.target.value)} className={selectCls + " h-9 text-xs"}>
                    <option value="">Selecionar</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nomeProduto}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Convênio</label>
                  <select value={ctxConvenioId} onChange={e => setCtxConvenioId(e.target.value)} className={selectCls + " h-9 text-xs"}>
                    <option value="">Nenhum</option>
                    {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tabela extraída */}
          {editados.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{selecionadas.size} de {editados.length} selecionada(s)</p>
                <button onClick={toggleTodos} className="text-xs text-brand hover:underline">
                  {selecionadas.size === editados.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800 overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-800/80 backdrop-blur z-10">
                    <tr>
                      <th className="px-3 py-2 text-zinc-400 w-8">✓</th>
                      <th className="px-3 py-2 text-left text-zinc-400">Tabela</th>
                      <th className="px-3 py-2 text-center text-zinc-400">Taxa%</th>
                      <th className="px-3 py-2 text-center text-zinc-400">Prazo</th>
                      <th className="px-3 py-2 text-center text-zinc-400">Comissão%</th>
                      <th className="px-3 py-2 text-center text-zinc-400">Coeficiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editados.map((item, i) => (
                      <tr key={i} className={`border-t border-zinc-800/50 ${selecionadas.has(i) ? "bg-brand/5" : "opacity-40"}`}>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={selecionadas.has(i)} onChange={() => toggleLinha(i)} className="rounded" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={item.tabela} onChange={e => updateItem(i, "tabela", e.target.value)} className="w-full bg-transparent border-b border-zinc-700/50 text-white px-1 py-0.5 focus:outline-none focus:border-brand text-xs" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input value={item.taxa_juros} onChange={e => updateItem(i, "taxa_juros", e.target.value)} className="w-16 bg-transparent border-b border-zinc-700/50 text-white text-center px-1 py-0.5 focus:outline-none focus:border-brand text-xs" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input value={item.prazo_maximo} onChange={e => updateItem(i, "prazo_maximo", e.target.value)} className="w-12 bg-transparent border-b border-zinc-700/50 text-white text-center px-1 py-0.5 focus:outline-none focus:border-brand text-xs" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input value={item.percentual_comissao} onChange={e => updateItem(i, "percentual_comissao", e.target.value)} className="w-16 bg-transparent border-b border-zinc-700/50 text-emerald-400 font-bold text-center px-1 py-0.5 focus:outline-none focus:border-brand text-xs" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input value={item.coeficiente} onChange={e => updateItem(i, "coeficiente", e.target.value)} className="w-20 bg-transparent border-b border-zinc-700/50 text-white text-center px-1 py-0.5 focus:outline-none focus:border-brand text-xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Salvar */}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition">Cancelar</button>
                <button onClick={handleSalvar} disabled={salvando || selecionadas.size === 0} className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {salvando ? "Salvando..." : `Importar ${selecionadas.size} Tabela(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
