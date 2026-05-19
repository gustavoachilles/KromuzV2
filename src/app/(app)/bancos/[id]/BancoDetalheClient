"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Layers, Calculator, BookOpen, Plus, Loader2, X } from "lucide-react";

type Produto = { id: string; nomeProduto: string; tipoProduto: string; ativo: boolean };
type Tabela = { id: string; nome: string; prazo: number; taxaJurosMensal: number; coeficiente: number; comissaoFlatPct: number | null; comissaoRepassePct: number | null; produto: { nomeProduto: string; tipoProduto: string } };
type Regra = { id: string; tipoOperacao: string; produtoNome: string; versaoRoteiro: string | null };
type BancoCompleto = { id: string; nome: string; codigoCompe: string | null; cnpj: string | null; tipo: string; ativo: boolean; ativoSimulacao: boolean; observacoes: string | null; permiteIntegracao: boolean; credenciaisApi: any; fatorSaldo: number | null; prazoMaximo: number | null; produtosCredito: Produto[]; tabelasCoeficiente: Tabela[]; regrasProduto: Regra[] };

const tipoLabel: Record<string, string> = { EMPRESTIMO_CONSIGNADO: "Margem Nova", REFINANCIAMENTO: "Refin", PORTABILIDADE: "Port", PORTABILIDADE_REFIN: "Port + Refin", CARTAO_CONSIGNADO: "Cartão Consig", CARTAO_BENEFICIO: "Cartão Benefício" };

export function BancoDetalheClient({ banco, empresaId }: { banco: BancoCompleto; empresaId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"tabelas" | "regras" | "integracao">("tabelas");
  const [modalTabela, setModalTabela] = useState(false);
  const [modalProduto, setModalProduto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [produtosLocal, setProdutosLocal] = useState(banco.produtosCredito);
  const [formProduto, setFormProduto] = useState({ nomeProduto: "", tipoProduto: "EMPRESTIMO_CONSIGNADO", prazoMaximo: "84", taxaMedia: "1.80" });
  const [formTabela, setFormTabela] = useState({ produtoId: banco.produtosCredito[0]?.id || "", nome: "", prazo: 84, taxaJurosMensal: 1.8, coeficiente: 0.022, comissaoFlatPct: "", comissaoRepassePct: "" });
  const [formIntegracao, setFormIntegracao] = useState({ permiteIntegracao: banco.permiteIntegracao || false, credenciaisApi: banco.credenciaisApi ? JSON.stringify(banco.credenciaisApi, null, 2) : '{\n  "client_id": "",\n  "client_secret": ""\n}' });
  const [salvandoIntegracao, setSalvandoIntegracao] = useState(false);

  async function salvarIntegracao(e: React.FormEvent) {
    e.preventDefault(); setSalvandoIntegracao(true); setErro(null);
    try {
      const parsed = JSON.parse(formIntegracao.credenciaisApi);
      const res = await fetch(`/api/bancos/${banco.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permiteIntegracao: formIntegracao.permiteIntegracao, credenciaisApi: parsed }) });
      if (!res.ok) { const d = await res.json(); setErro(d.error); } else { alert("Integração salva!"); router.refresh(); }
    } catch { setErro("JSON inválido."); } finally { setSalvandoIntegracao(false); }
  }

  async function criarTabela(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true); setErro(null);
    const res = await fetch(`/api/bancos/${banco.id}/tabelas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formTabela, comissaoFlatPct: formTabela.comissaoFlatPct ? parseFloat(formTabela.comissaoFlatPct) : null, comissaoRepassePct: formTabela.comissaoRepassePct ? parseFloat(formTabela.comissaoRepassePct) : null }) });
    const data = await res.json();
    if (!res.ok) { setErro(data.error); setSalvando(false); return; }
    setModalTabela(false); setSalvando(false); router.refresh();
  }

  async function criarProduto(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true); setErro(null);
    const res = await fetch("/api/produtos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bancoId: banco.id, nomeProduto: formProduto.nomeProduto, tipoProduto: formProduto.tipoProduto, prazoMaximo: formProduto.prazoMaximo ? Number(formProduto.prazoMaximo) : undefined, taxaMedia: formProduto.taxaMedia ? Number(formProduto.taxaMedia) : undefined }) });
    const data = await res.json();
    if (!res.ok) { setErro(data.error); setSalvando(false); return; }
    setProdutosLocal(prev => [...prev, { id: data.id, nomeProduto: data.nomeProduto, tipoProduto: data.tipoProduto, ativo: true }]);
    setFormTabela(prev => ({ ...prev, produtoId: prev.produtoId || data.id }));
    setModalProduto(false); setSalvando(false);
    setFormProduto({ nomeProduto: "", tipoProduto: "EMPRESTIMO_CONSIGNADO", prazoMaximo: "84", taxaMedia: "1.80" });
    router.refresh();
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <button onClick={() => router.push("/bancos")} className="flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Bancos
        </button>
        <header className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-lg shrink-0">{banco.nome.slice(0, 2).toUpperCase()}</div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{banco.nome}</h1>
            <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
              {banco.codigoCompe && <span>COMPE {banco.codigoCompe}</span>}
              {banco.cnpj && <span>CNPJ {banco.cnpj}</span>}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${banco.ativoSimulacao ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>
                {banco.ativoSimulacao ? "Ativo na Simulação" : "Inativo na Simulação"}
              </span>
            </div>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[{ icon: Layers, count: produtosLocal.length, label: "Produtos" }, { icon: Calculator, count: banco.tabelasCoeficiente.length, label: "Tabelas" }, { icon: BookOpen, count: banco.regrasProduto.length, label: "Regras Ativas" }].map((k, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><k.icon className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold tabular-nums">{k.count}</p><p className="text-xs text-zinc-500 uppercase tracking-wider">{k.label}</p></div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
          {(["tabelas", "regras", "integracao"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
              {t === "tabelas" ? "Tabelas de Coeficientes" : t === "regras" ? "Regras Operacionais" : "Integração API"}
            </button>
          ))}
        </div>

        {/* Tab: Integração */}
        {tab === "integracao" && (
          <form onSubmit={salvarIntegracao} className="space-y-6 max-w-2xl bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div><h2 className="text-lg font-semibold mb-1">Configurações de Integração</h2><p className="text-sm text-zinc-500">Configure as credenciais para digitação automática.</p></div>
            {erro && tab === "integracao" && <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 p-4 text-sm text-red-700">{erro}</div>}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded border-zinc-300 text-brand focus:ring-brand/50" checked={formIntegracao.permiteIntegracao} onChange={e => setFormIntegracao({...formIntegracao, permiteIntegracao: e.target.checked})} />
              <span className="text-sm font-medium">Ativar digitação automática</span>
            </label>
            {formIntegracao.permiteIntegracao && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Credenciais (JSON)</label>
                <textarea required rows={6} value={formIntegracao.credenciaisApi} onChange={e => setFormIntegracao({...formIntegracao, credenciaisApi: e.target.value})} className="w-full font-mono text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50" />
              </div>
            )}
            <button type="submit" disabled={salvandoIntegracao} className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
              {salvandoIntegracao && <Loader2 className="h-4 w-4 animate-spin" />} Salvar Credenciais
            </button>
          </form>
        )}

        {/* Tab: Tabelas */}
        {tab === "tabelas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tabelas de Coeficientes</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setModalProduto(true)} className="flex items-center gap-2 rounded-lg border border-brand text-brand px-4 py-2 text-sm font-medium hover:bg-brand/5 transition"><Plus className="h-4 w-4" /> Novo Produto</button>
                <button onClick={() => setModalTabela(true)} disabled={produtosLocal.length === 0} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"><Plus className="h-4 w-4" /> Nova Tabela</button>
              </div>
            </div>
            {produtosLocal.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {produtosLocal.map(p => (<span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-brand/10 text-brand"><Layers className="h-3 w-3" />{p.nomeProduto} ({tipoLabel[p.tipoProduto] || p.tipoProduto})</span>))}
              </div>
            )}
            {produtosLocal.length === 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center justify-between">
                <span>⚠️ Sem produtos cadastrados. Crie um produto para cadastrar tabelas.</span>
                <button onClick={() => setModalProduto(true)} className="ml-4 shrink-0 text-xs font-semibold underline hover:no-underline">+ Criar Produto</button>
              </div>
            )}
            {banco.tabelasCoeficiente.length === 0 ? (
              <div className="text-center py-16 text-zinc-400"><Calculator className="h-10 w-10 mx-auto mb-3 text-zinc-300" /><p className="text-sm">Nenhuma tabela cadastrada.</p></div>
            ) : (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Produto</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Prazo</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Taxa a.m.</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Coeficiente</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Comissão</th>
                  </tr></thead>
                  <tbody>{banco.tabelasCoeficiente.map(t => (
                    <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-3 font-medium">{t.nome}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full">{tipoLabel[t.produto.tipoProduto] || t.produto.tipoProduto}</span></td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums">{t.prazo}x</td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums">{t.taxaJurosMensal.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums">{t.coeficiente.toFixed(6)}</td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums text-zinc-500">{t.comissaoFlatPct ? `${t.comissaoFlatPct}%` : "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Regras */}
        {tab === "regras" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Regras Operacionais</h2>
            {banco.regrasProduto.length === 0 ? (
              <div className="text-center py-16 text-zinc-400"><BookOpen className="h-10 w-10 mx-auto mb-3 text-zinc-300" /><p className="text-sm">Nenhuma regra extraída.</p><p className="text-xs mt-1">Importe roteiros no Motor de Regras.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {banco.regrasProduto.map(r => (
                  <div key={r.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-xs font-bold shrink-0">{tipoLabel[r.tipoOperacao]?.slice(0, 3).toUpperCase() || "???"}</div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{r.produtoNome}</p><p className="text-xs text-zinc-500">{tipoLabel[r.tipoOperacao] || r.tipoOperacao}{r.versaoRoteiro && ` · v${r.versaoRoteiro}`}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Nova Tabela */}
      {modalTabela && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Nova Tabela de Coeficiente</h2>
              <button onClick={() => setModalTabela(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={criarTabela} className="p-6 space-y-4">
              {erro && <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{erro}</div>}
              <div className="space-y-2"><label className="text-sm font-medium">Produto</label>
                <select required value={formTabela.produtoId} onChange={e => setFormTabela({...formTabela, produtoId: e.target.value})} className={inputCls}>
                  {produtosLocal.map(p => (<option key={p.id} value={p.id}>{p.nomeProduto} ({tipoLabel[p.tipoProduto] || p.tipoProduto})</option>))}
                </select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Nome da Tabela</label><input required value={formTabela.nome} onChange={e => setFormTabela({...formTabela, nome: e.target.value})} placeholder="Ex: INSS Port 84x" className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Prazo</label><input type="number" required min={1} max={120} value={formTabela.prazo} onChange={e => setFormTabela({...formTabela, prazo: parseInt(e.target.value)})} className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Taxa a.m. (%)</label><input type="number" required step="0.01" min={0} value={formTabela.taxaJurosMensal} onChange={e => setFormTabela({...formTabela, taxaJurosMensal: parseFloat(e.target.value)})} className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Coeficiente</label><input type="number" required step="0.000001" min={0} value={formTabela.coeficiente} onChange={e => setFormTabela({...formTabela, coeficiente: parseFloat(e.target.value)})} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-zinc-500">Comissão Flat (%)</label><input type="number" step="0.01" value={formTabela.comissaoFlatPct} onChange={e => setFormTabela({...formTabela, comissaoFlatPct: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-zinc-500">Comissão Repasse (%)</label><input type="number" step="0.01" value={formTabela.comissaoRepassePct} onChange={e => setFormTabela({...formTabela, comissaoRepassePct: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalTabela(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {salvando ? "Salvando..." : "Criar Tabela"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Produto */}
      {modalProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Novo Produto — {banco.nome}</h2>
              <button onClick={() => setModalProduto(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={criarProduto} className="p-6 space-y-4">
              {erro && <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{erro}</div>}
              <div className="space-y-2"><label className="text-sm font-medium">Nome do Produto *</label><input required value={formProduto.nomeProduto} onChange={e => setFormProduto({...formProduto, nomeProduto: e.target.value})} placeholder="Ex: Margem Livre INSS" className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Tipo *</label>
                <select value={formProduto.tipoProduto} onChange={e => setFormProduto({...formProduto, tipoProduto: e.target.value})} className={inputCls}>
                  {Object.entries(tipoLabel).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-zinc-500">Prazo Máx</label><input type="number" value={formProduto.prazoMaximo} onChange={e => setFormProduto({...formProduto, prazoMaximo: e.target.value})} className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-zinc-500">Taxa %</label><input type="number" step="0.01" value={formProduto.taxaMedia} onChange={e => setFormProduto({...formProduto, taxaMedia: e.target.value})} className={inputCls} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalProduto(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {salvando ? "Criando..." : "Criar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
