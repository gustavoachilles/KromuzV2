"use client";
import { ArrowRightLeft, Building2, TrendingDown, FileText, Trophy, Zap, Info, Star, ChevronDown, ChevronUp, Calculator, Printer, Filter } from "lucide-react";
import { useState, useMemo, useRef } from "react";

type Tabela = { id:string; nome:string; prazo:number; taxaJurosMensal:number; coeficiente:number; comissaoFlatPct:number|null; comissaoRepassePct?:number|null; banco:{nome:string}; produto:{nomeProduto:string} };
type PropostaGrupo = { bancoNome:string|null; status:string; _count:number; _sum:{valorLiberado:number|null} };
type PropostaMensal = { bancoNome:string|null; status:string; valorLiberado:number|null; taxaJuros:number|null; createdAt:string };
type Regra = { id:string; bancoNome:string; especies?:any; faixasEtarias?:any; portPermitido?:boolean; refinPermitido?:boolean; [k:string]:any };

export function PortabilidadeClient({ regras, tabelas, propostas, propostasMensais=[] }: { regras:Regra[]; tabelas:Tabela[]; propostas:PropostaGrupo[]; propostasMensais?:PropostaMensal[] }) {
  const [expanded, setExpanded] = useState<string|null>(null);
  const [divida, setDivida] = useState(50000);
  const [taxaOrig, setTaxaOrig] = useState(1.80);
  const [prazoSim, setPrazoSim] = useState(84);
  const [parcelaInput, setParcelaInput] = useState<Record<string,string>>({});
  const [filtroEspecie, setFiltroEspecie] = useState("");
  const [comparing, setComparing] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const bancoMap = new Map<string, Tabela[]>();
  tabelas.forEach(t => { const l = bancoMap.get(t.banco.nome)||[]; l.push(t); bancoMap.set(t.banco.nome, l); });

  const bancosOrdenados = useMemo(() => Array.from(bancoMap.entries()).map(([banco, tabs]) => ({
    banco, menorTaxa: Math.min(...tabs.map(t=>t.taxaJurosMensal)), maiorPrazo: Math.max(...tabs.map(t=>t.prazo)),
    tabelas: tabs.sort((a,b) => a.prazo-b.prazo || a.taxaJurosMensal-b.taxaJurosMensal),
    propostas: propostas.filter(p=>p.bancoNome===banco),
    produtos: [...new Set(tabs.map(t=>t.produto.nomeProduto))],
  })).sort((a,b)=>a.menorTaxa-b.menorTaxa), [tabelas, propostas]);

  const menorTaxa = tabelas.length>0 ? Math.min(...tabelas.map(t=>t.taxaJurosMensal)) : 0;
  const totalProps = propostas.reduce((s,p)=>s+p._count,0);
  const pOrig = divida*(taxaOrig/100)/(1-Math.pow(1+taxaOrig/100,-prazoSim));
  const pNova = menorTaxa>0 ? divida*(menorTaxa/100)/(1-Math.pow(1+menorTaxa/100,-prazoSim)) : pOrig;
  const econMes = pOrig-pNova;

  // Histórico por mês
  const mesesHist = useMemo(() => {
    const m: Record<string, {total:number; aprovadas:number; volume:number}> = {};
    (propostasMensais||[]).forEach(p => {
      const d = new Date(p.createdAt); const k = `${d.getMonth()+1}/${d.getFullYear()}`;
      if(!m[k]) m[k]={total:0,aprovadas:0,volume:0};
      m[k].total++; if(p.status==="APROVADA"||p.status==="PAGA") { m[k].aprovadas++; m[k].volume+=(p.valorLiberado||0); }
    }); return Object.entries(m).slice(-6);
  }, [propostasMensais]);
  const maxVol = Math.max(...mesesHist.map(([,v])=>v.volume), 1);

  const handlePrint = () => { window.print(); };
  const toggleCompare = (b:string) => setComparing(prev => prev.includes(b) ? prev.filter(x=>x!==b) : prev.length<3 ? [...prev,b] : prev);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black print:bg-white">
      <div ref={printRef} className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
              <ArrowRightLeft className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Portabilidade</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Mapa de Portabilidade</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl text-sm">Painel estratégico para comparar taxas, coeficientes e simular economia por banco receptor. Consulte antes de ligar para o cliente.</p>
          </div>
          <button onClick={handlePrint} className="print:hidden flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition">
            <Printer className="h-4 w-4" />Exportar
          </button>
        </header>

        {/* Resumo */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 p-5 print:border print:border-sky-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
            <div className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
              <p className="font-semibold text-sky-700 dark:text-sky-400">Como usar este mapa</p>
              <p>Consolida <strong>{regras.length} regras</strong> em <strong>{bancosOrdenados.length} bancos</strong>. Bancos ordenados do mais competitivo ao menos. Fórmula: <em>Parcela ÷ Coeficiente = Valor Liberado</em>. Use o simulador inline para calcular rapidamente.</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <FileText className="h-5 w-5 text-sky-500" />, val: regras.length, label: "Regras Ativas" },
            { icon: <Building2 className="h-5 w-5 text-indigo-500" />, val: bancosOrdenados.length, label: "Bancos Receptores" },
            { icon: <TrendingDown className="h-5 w-5 text-emerald-500" />, val: `${menorTaxa.toFixed(2)}%`, label: "Menor Taxa a.m.", highlight: true },
            { icon: <Zap className="h-5 w-5 text-amber-500" />, val: totalProps, label: "Propostas Geradas" },
          ].map((k,i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
              <div className="mx-auto mb-2 w-fit">{k.icon}</div>
              <p className={`text-2xl font-bold tabular-nums ${k.highlight?"text-emerald-600":""}`}>{k.val}</p>
              <p className="text-xs text-zinc-500">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="print:hidden flex flex-wrap gap-3 items-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select value={filtroEspecie} onChange={e=>setFiltroEspecie(e.target.value)} className="text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 bg-white dark:bg-zinc-800">
            <option value="">Todas as Espécies</option>
            {[21,32,41,42,87,88].map(e=><option key={e} value={String(e)}>Espécie {e}</option>)}
          </select>
          {comparing.length>0 && <span className="text-xs text-sky-600 font-semibold">{comparing.length} banco(s) selecionado(s) para comparação</span>}
        </div>

        {bancosOrdenados.length===0 ? (
          <div className="text-center py-20"><ArrowRightLeft className="h-12 w-12 text-zinc-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-zinc-600">Nenhuma regra de portabilidade</h3></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4 print:hidden">
              {/* Radar Dinâmico */}
              <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-gradient-to-b from-sky-50 to-white dark:from-sky-950/30 dark:to-zinc-900 p-6 sticky top-24">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 mb-4"><TrendingDown className="w-5 h-5" /><h3 className="font-bold text-sm">Radar de Economia</h3></div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Dívida (R$)</label>
                    <input type="number" value={divida} onChange={e=>setDivida(Number(e.target.value)||0)} className="w-full mt-1 px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Taxa Origem (%)</label>
                      <input type="number" step="0.01" value={taxaOrig} onChange={e=>setTaxaOrig(Number(e.target.value)||0)} className="w-full mt-1 px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Prazo</label>
                      <input type="number" value={prazoSim} onChange={e=>setPrazoSim(Number(e.target.value)||84)} className="w-full mt-1 px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800" />
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                    <p className="text-[10px] uppercase font-bold opacity-80">Melhor Taxa Hoje</p>
                    <p className="text-2xl font-black">{menorTaxa.toFixed(2)}% a.m.</p>
                    <p className="text-[10px] mt-1 opacity-70">{bancosOrdenados[0]?.banco}</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <p className="text-xs text-zinc-600">Economia: <span className="font-bold text-emerald-600">R$ {econMes.toFixed(0)}/mês</span></p>
                    <p className="text-xs text-zinc-600">Total: <span className="font-bold text-emerald-600">R$ {(econMes*prazoSim).toLocaleString("pt-BR",{maximumFractionDigits:0})}</span></p>
                  </div>
                </div>
              </div>

              {/* Histórico (gráfico barras CSS) */}
              {mesesHist.length>0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                  <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Histórico 6 Meses</p>
                  <div className="space-y-2">
                    {mesesHist.map(([mes, d]) => (
                      <div key={mes}>
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5"><span>{mes}</span><span>R$ {d.volume.toLocaleString("pt-BR",{maximumFractionDigits:0})}</span></div>
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all" style={{width:`${(d.volume/maxVol)*100}%`}} />
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[9px] text-zinc-400">{d.total} prop.</span>
                          {d.total>0 && <span className="text-[9px] text-emerald-500">{((d.aprovadas/d.total)*100).toFixed(0)}% aprovação</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legenda */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Legenda</p>
                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {[["bg-amber-400","🏆 Melhor taxa"],["bg-emerald-400","< 1.70%"],["bg-sky-400","1.70% - 1.85%"],["bg-zinc-400","> 1.85%"]].map(([c,t])=>(
                    <div key={t} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${c}`}/><span>{t}</span></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bancos */}
            <div className="lg:col-span-3 space-y-4">
              {/* Comparador */}
              {comparing.length>=2 && (
                <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 dark:bg-sky-950/20 p-6 print:hidden">
                  <h3 className="font-bold text-sm text-sky-700 mb-3">⚖️ Comparação Direta</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-white dark:bg-zinc-800"><th className="px-3 py-2 text-left">Banco</th><th className="px-3 py-2 text-right">Menor Taxa</th><th className="px-3 py-2 text-right">Tabelas</th><th className="px-3 py-2 text-right">Prazo Máx</th><th className="px-3 py-2 text-right">Propostas</th><th className="px-3 py-2 text-right">Aprovação</th></tr></thead>
                      <tbody>{comparing.map(bn => {
                        const b = bancosOrdenados.find(x=>x.banco===bn); if(!b) return null;
                        const tot = b.propostas.reduce((s,p)=>s+p._count,0);
                        const aprov = b.propostas.filter(p=>p.status==="APROVADA"||p.status==="PAGA").reduce((s,p)=>s+p._count,0);
                        return (<tr key={bn} className="border-t"><td className="px-3 py-2 font-semibold">{bn}</td><td className="px-3 py-2 text-right text-emerald-600 font-bold">{b.menorTaxa.toFixed(2)}%</td><td className="px-3 py-2 text-right">{b.tabelas.length}</td><td className="px-3 py-2 text-right">{b.maiorPrazo}x</td><td className="px-3 py-2 text-right">{tot}</td><td className="px-3 py-2 text-right">{tot>0?`${((aprov/tot)*100).toFixed(0)}%`:"—"}</td></tr>);
                      })}</tbody>
                    </table>
                  </div>
                  <button onClick={()=>setComparing([])} className="mt-3 text-xs text-sky-600 hover:underline">Limpar comparação</button>
                </div>
              )}

              {bancosOrdenados.map((b, idx) => {
                const tot = b.propostas.reduce((s,p)=>s+p._count,0);
                const aprov = b.propostas.filter(p=>p.status==="APROVADA"||p.status==="PAGA").reduce((s,p)=>s+p._count,0);
                const vol = b.propostas.reduce((s,p)=>s+(p._sum.valorLiberado||0),0);
                const isBest = idx===0;
                const isOpen = expanded===b.banco || isBest;
                const tc = b.menorTaxa<=menorTaxa?"text-amber-500":b.menorTaxa<1.70?"text-emerald-600":b.menorTaxa<=1.85?"text-sky-600":"text-zinc-500";
                const parcVal = parseFloat(parcelaInput[b.banco]||"0");

                return (
                  <div key={b.banco} className={`rounded-2xl border overflow-hidden transition-all ${isBest?"border-amber-300 dark:border-amber-700 shadow-lg ring-1 ring-amber-200/50":"border-zinc-200 dark:border-zinc-800 hover:border-sky-300"} bg-white dark:bg-zinc-900`}>
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Compare checkbox */}
                        <input type="checkbox" checked={comparing.includes(b.banco)} onChange={()=>toggleCompare(b.banco)} className="print:hidden w-4 h-4 rounded text-sky-500 border-zinc-300" title="Comparar" />
                        <button onClick={()=>setExpanded(expanded===b.banco?null:b.banco)} className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-black ${isBest?"bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg":"bg-sky-100 dark:bg-sky-900 text-sky-600"}`}>
                            {isBest?<Trophy className="h-5 w-5" />:<span>{idx+1}º</span>}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm">{b.banco}</h3>
                              {isBest && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">Melhor Taxa</span>}
                            </div>
                            <p className="text-[11px] text-zinc-500">{b.tabelas.length} tab · {b.produtos.join(", ")} · Máx {b.maiorPrazo}x · <span className={`font-semibold ${tc}`}>{b.menorTaxa.toFixed(2)}%</span></p>
                          </div>
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Indicador aprovação */}
                        {tot>0 && (
                          <div className="text-right">
                            <p className="text-xs font-bold">{tot} prop.</p>
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${tot>0?(aprov/tot)*100:0}%`}} /></div>
                              <span className="text-[10px] text-emerald-600">{tot>0?((aprov/tot)*100).toFixed(0):0}%</span>
                            </div>
                          </div>
                        )}
                        <button onClick={()=>setExpanded(expanded===b.banco?null:b.banco)} className="print:hidden">{isOpen?<ChevronUp className="h-4 w-4 text-zinc-400"/>:<ChevronDown className="h-4 w-4 text-zinc-400"/>}</button>
                      </div>
                    </div>

                    {isOpen && (
                      <>
                        {/* Simulação rápida inline */}
                        <div className="print:hidden px-6 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 flex-wrap">
                          <Calculator className="h-4 w-4 text-zinc-400" />
                          <span className="text-xs text-zinc-500">Simulação rápida:</span>
                          <input type="number" placeholder="Parcela do cliente (R$)" value={parcelaInput[b.banco]||""} onChange={e=>setParcelaInput({...parcelaInput,[b.banco]:e.target.value})} className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 w-48" />
                          {parcVal>0 && b.tabelas.length>0 && (
                            <span className="text-xs font-bold text-emerald-600">→ Liberado: R$ {(parcVal/b.tabelas[0].coeficiente).toLocaleString("pt-BR",{maximumFractionDigits:0})} ({b.tabelas[0].prazo}x a {b.tabelas[0].taxaJurosMensal.toFixed(2)}%)</span>
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-zinc-50 dark:bg-zinc-800/40">
                              <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">Tabela</th>
                              <th className="text-center px-4 py-2.5 text-zinc-500 font-medium">Produto</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Prazo</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Taxa a.m.</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Coeficiente</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Lib. p/ R$100</th>
                              {parcVal>0 && <th className="text-right px-4 py-2.5 text-emerald-600 font-medium">Liberado</th>}
                              <th className="text-right px-4 py-2.5 text-amber-600 font-medium">Comissão</th>
                            </tr></thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {b.tabelas.map(t => {
                                const lib100 = 100/t.coeficiente;
                                const isBestRow = t.taxaJurosMensal===b.menorTaxa;
                                const comissao = t.comissaoRepassePct ?? t.comissaoFlatPct;
                                return (
                                  <tr key={t.id} className={isBestRow?"bg-emerald-50/50 dark:bg-emerald-950/10":"hover:bg-zinc-50 dark:hover:bg-zinc-800/30"}>
                                    <td className="px-4 py-2.5 font-medium"><div className="flex items-center gap-1.5">{isBestRow&&<Star className="h-3 w-3 text-amber-400 fill-amber-400"/>}{t.nome}</div></td>
                                    <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.produto.nomeProduto.includes("Refin")?"bg-violet-100 text-violet-700":"bg-sky-100 text-sky-700"}`}>{t.produto.nomeProduto.includes("Refin")?"Port+Refin":"Port"}</span></td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{t.prazo}x</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums"><span className={`font-semibold ${tc}`}>{t.taxaJurosMensal.toFixed(2)}%</span></td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-mono text-zinc-500">{t.coeficiente.toFixed(6)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-sky-600">R$ {lib100.toFixed(0)}</td>
                                    {parcVal>0 && <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-600">R$ {(parcVal/t.coeficiente).toLocaleString("pt-BR",{maximumFractionDigits:0})}</td>}
                                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-amber-600">{comissao!=null?`${comissao}%`:<span className="text-zinc-300">—</span>}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
