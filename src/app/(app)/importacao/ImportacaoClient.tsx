"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Download, X, ArrowRight, ArrowLeft, Pencil, Trash2, Sparkles, Zap, Table2 } from "lucide-react";
import * as XLSX from "xlsx";
import { autoMapColumns, applyMapping, FIELD_LABELS, type ImportRow, type MappedLead } from "./importHelpers";

type Step = 1|2|3|4;

export function ImportacaoClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<ImportRow[]>([]);
  const [mapping, setMapping] = useState<Record<string,string>>({});
  const [leads, setLeads] = useState<MappedLead[]>([]);
  const [duplicados, setDuplicados] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<"pular"|"atualizar">("pular");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string|null>(null);
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [porPagina, setPorPagina] = useState(25);
  const [pagina, setPagina] = useState(1);
  const [dragOver, setDragOver] = useState(false);

  // STEP 1: Parse file
  const parseFile = useCallback((file: File) => {
    setNomeArquivo(file.name);
    setErro(null); setResultado(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv" || ext === "txt") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setErro("Arquivo vazio ou sem dados"); return; }
        const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
        const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, "").trim());
        const rows: ImportRow[] = [];
        for (let i = 1; i < Math.min(lines.length, 10001); i++) {
          const cols = lines[i].split(sep).map(c => c.replace(/^"|"$/g, "").trim());
          const obj: ImportRow = {};
          headers.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
          rows.push(obj);
        }
        setRawHeaders(headers); setRawRows(rows);
        setMapping(autoMapColumns(headers));
        setStep(2);
      };
      reader.readAsText(file, "UTF-8");
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: "array" });
          // Auto-selecionar aba com mais dados
          let bestSheet = wb.SheetNames[0];
          let bestCount = 0;
          for (const name of wb.SheetNames) {
            const d = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
            if (d.length > bestCount) { bestCount = d.length; bestSheet = name; }
          }
          const ws = wb.Sheets[bestSheet];
          const data = XLSX.utils.sheet_to_json<Record<string,any>>(ws, { defval: "" });
          if (data.length === 0) { setErro("Planilha vazia — nenhuma aba contém dados"); return; }
          const headers = Object.keys(data[0]);
          const rows = data.slice(0, 10000).map(r => {
            const obj: ImportRow = {};
            headers.forEach(h => { obj[h] = String(r[h] ?? ""); });
            return obj;
          });
          setRawHeaders(headers); setRawRows(rows);
          setMapping(autoMapColumns(headers));
          setStep(2);
        } catch(err) { console.error("Erro XLSX:", err); setErro(`Erro ao ler planilha: ${err instanceof Error ? err.message : "formato não suportado"}`); }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  // STEP 2->3: Apply mapping & check duplicates
  async function aplicarMapeamento() {
    const mapped = applyMapping(rawRows, mapping);
    const cpfs = mapped.map(l => l.cpf).filter(Boolean) as string[];
    if (cpfs.length > 0) {
      try {
        const res = await fetch("/api/importacao-clientes", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpfs }),
        });
        const data = await res.json();
        const dupSet = new Set<string>(data.duplicados || []);
        setDuplicados(dupSet);
        mapped.forEach(l => { if (l.cpf && dupSet.has(l.cpf)) l._isDuplicate = true; });
      } catch {}
    }
    setLeads(mapped); setPagina(1); setStep(3);
  }

  // STEP 3->4: Import
  async function importar() {
    const validos = leads.filter(l => l._errors.length === 0);
    if (validos.length === 0) { setErro("Nenhum lead válido"); return; }
    setImportando(true); setErro(null);
    const payload = validos.map(({ _idx, _errors, _isDuplicate, ...rest }) => rest);
    try {
      const res = await fetch("/api/importacao-clientes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: payload, modo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar");
      setResultado(data); setStep(4);
    } catch (e: any) {
      const msg = e.message || "Erro desconhecido";
      setErro(msg.length > 200 ? msg.substring(0, 200) + "…" : msg);
    }
    setImportando(false);
  }

  // Inline edit/delete
  function editarLead(idx: number, field: string, value: string) {
    setLeads(prev => {
      const copy = [...prev];
      const lead = { ...copy[idx] };
      (lead as any)[field] = value;
      // Revalidate
      lead._errors = [];
      if (!lead.nome.trim()) lead._errors.push("Nome vazio");
      if (field === "cpf") {
        let cpf = value.replace(/\D/g, "");
        if (cpf && cpf.length < 11 && cpf.length >= 9) cpf = cpf.padStart(11, "0");
        lead.cpf = cpf || undefined;
        if (cpf && cpf.length !== 11) lead._errors.push(`CPF inválido (${cpf.length} dígitos: ${value})`);
      }
      copy[idx] = lead;
      return copy;
    });
  }
  function confirmarEdicao(idx: number) {
    setEditIdx(null);
  }
  function irParaProximoErro() {
    const idx = leads.findIndex(l => l._errors.length > 0);
    if (idx === -1) return;
    const pag = Math.floor(idx / porPagina) + 1;
    setPagina(pag);
    setTimeout(() => tableRef.current?.scrollTo(0, 0), 50);
  }
  function removerLead(idx: number) {
    setLeads(prev => prev.filter((_, i) => i !== idx));
  }

  // Stats
  const totalValidos = leads.filter(l => l._errors.length === 0 && !l._isDuplicate).length;
  const totalErros = leads.filter(l => l._errors.length > 0).length;
  const totalDup = leads.filter(l => l._isDuplicate).length;

  const steps = [
    { n: 1, label: "Upload" },
    { n: 2, label: "Mapeamento" },
    { n: 3, label: "Validação" },
    { n: 4, label: "Resultado" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-brand mb-1">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Importação Inteligente</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Importar Clientes</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">CSV, Excel (.xlsx/.xls) ou TXT — até 10.000 registros</p>
        </header>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-all ${
                step > s.n ? "bg-brand text-white" : step === s.n ? "bg-brand text-white ring-4 ring-brand/20" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
              }`}>{step > s.n ? "✓" : s.n}</div>
              <span className={`text-xs font-medium hidden sm:block ${step >= s.n ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`}>{s.label}</span>
              {i < 3 && <div className={`flex-1 h-0.5 rounded ${step > s.n ? "bg-brand" : "bg-zinc-200 dark:bg-zinc-800"}`}/>}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all ${
                dragOver ? "border-brand bg-brand/10 scale-[1.02]" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-brand hover:bg-brand/5"
              }`}
            >
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-brand/20 rounded-2xl animate-pulse"/>
                <div className="relative flex items-center justify-center w-full h-full">
                  <FileSpreadsheet className="h-10 w-10 text-brand" />
                </div>
              </div>
              <p className="text-lg font-semibold">Arraste sua planilha aqui</p>
              <p className="text-sm text-zinc-500 mt-1">ou clique para selecionar</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                {["CSV","XLSX","XLS","XLSM","TXT"].map(f => (
                  <span key={f} className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500">.{f}</span>
                ))}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.xlsm,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
            </div>
            {erro && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-5 py-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{erro}</p>
                <button onClick={() => setErro(null)} className="ml-auto"><X className="h-4 w-4 text-red-400"/></button>
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Download className="h-4 w-4 text-zinc-400" /> Modelo CSV</h3>
              <pre className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg overflow-x-auto">
{`nome;cpf;telefone;email;uf;cidade;beneficio;margem
João da Silva;123.456.789-00;(11) 99999-0000;joao@email.com;SP;São Paulo;1234567890;350.00`}
              </pre>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="h-5 w-5 text-amber-500"/>
                <div>
                  <h2 className="text-lg font-bold">Mapeamento de Colunas</h2>
                  <p className="text-xs text-zinc-500">{nomeArquivo} · {rawRows.length} linhas · {rawHeaders.length} colunas detectadas</p>
                </div>
              </div>
              <div className="space-y-2">
                {rawHeaders.map(h => {
                  const sample = rawRows[0]?.[h] || "";
                  return (
                    <div key={h} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{h}</p>
                        <p className="text-[10px] text-zinc-400 truncate">ex: {sample || "—"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-300 shrink-0"/>
                      <select value={mapping[h] || "_ignorar"} onChange={e => setMapping({...mapping, [h]: e.target.value})}
                        className={`w-44 rounded-lg border px-3 py-2 text-sm font-medium ${
                          mapping[h] && mapping[h] !== "_ignorar" ? "border-brand bg-brand/5 text-brand" : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                        }`}>
                        <option value="_ignorar">— Ignorar —</option>
                        {Object.entries(FIELD_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => { setStep(1); setRawRows([]); setRawHeaders([]); }} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1"><ArrowLeft className="h-4 w-4"/> Voltar</button>
              <button onClick={aplicarMapeamento} disabled={!mapping[Object.keys(mapping).find(k => mapping[k]==="nome")||""]}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-40 transition">
                Validar Dados <ArrowRight className="h-4 w-4"/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Válidos", n: totalValidos, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", icon: "✅" },
                { label: "Duplicatas", n: totalDup, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", icon: "⚠️" },
                { label: "Com Erro", n: totalErros, color: "text-red-600 bg-red-50 dark:bg-red-950/30", icon: "❌" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                  <p className="text-2xl font-bold tabular-nums">{s.n}</p>
                  <p className="text-xs font-medium mt-0.5">{s.icon} {s.label}</p>
                </div>
              ))}
            </div>
            {totalErros > 0 && (
              <button onClick={irParaProximoErro} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold shadow-lg shadow-red-600/20 hover:bg-red-700 transition w-full justify-center">
                <AlertTriangle className="h-4 w-4"/> Ir para próximo erro ({totalErros} restantes)
              </button>
            )}
            {totalDup > 0 && (
              <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <span className="text-sm">Duplicatas (CPF já existe):</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="modo" checked={modo==="pular"} onChange={() => setModo("pular")} className="accent-brand"/> Pular
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="modo" checked={modo==="atualizar"} onChange={() => setModo("atualizar")} className="accent-brand"/> Atualizar
                </label>
              </div>
            )}
            {/* Table */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="font-bold flex items-center gap-2"><Table2 className="h-5 w-5 text-brand"/>Preview</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Exibir:</span>
                  {[10,25,50,100].map(n => (
                    <button key={n} onClick={() => { setPorPagina(n); setPagina(1); }}
                      className={`px-2 py-1 rounded-lg font-semibold ${porPagina===n ? "bg-brand text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div ref={tableRef} className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-[11px]">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 sticky top-0"><tr>
                    <th className="px-3 py-2 text-left text-zinc-500">#</th>
                    <th className="px-3 py-2 text-center text-zinc-500">⚡</th>
                    <th className="px-3 py-2 text-left text-zinc-500">Nome</th>
                    <th className="px-3 py-2 text-left text-zinc-500">CPF</th>
                    <th className="px-3 py-2 text-left text-zinc-500">Telefone</th>
                    <th className="px-3 py-2 text-left text-zinc-500">UF</th>
                    <th className="px-3 py-2 text-right text-zinc-500">Margem</th>
                    <th className="px-3 py-2 text-left text-zinc-500">Benefício</th>
                    <th className="px-3 py-2 text-center text-zinc-500">Ações</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {leads.slice((pagina-1)*porPagina, pagina*porPagina).map((l, i) => {
                      const globalIdx = (pagina-1)*porPagina + i;
                      const isError = l._errors.length > 0;
                      const isDup = l._isDuplicate;
                      const isEditing = editIdx === globalIdx;
                      return (
                        <tr key={globalIdx} className={`${isError ? "bg-red-50/50 dark:bg-red-950/10" : isDup ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                          <td className="px-3 py-2 text-zinc-400 tabular-nums">{globalIdx+1}</td>
                          <td className="px-3 py-2 text-center">
                            {isError ? <span className="cursor-help" title={l._errors.join(", ")}>❌</span> : isDup ? <span title="CPF duplicado">⚠️</span> : <span>✅</span>}
                          </td>
                          <td className="px-3 py-2">{(isEditing || isError) ? <input value={l.nome} onChange={e => editarLead(globalIdx,"nome",e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${l._errors.some(e => e.includes("Nome")) ? "border-red-400 bg-red-50" : ""}`}/> : <span className="font-semibold">{l.nome || "—"}</span>}</td>
                          <td className="px-3 py-2 tabular-nums">{(isEditing || isError) ? <input value={l.cpf||""} onChange={e => editarLead(globalIdx,"cpf",e.target.value)} className={`w-28 px-2 py-1 border rounded text-xs ${l._errors.some(e => e.includes("CPF")) ? "border-red-400 bg-red-50" : ""}`}/> : (l.cpf || "—")}</td>
                          <td className="px-3 py-2">{(isEditing || isError) ? <input value={l.telefone||""} onChange={e => editarLead(globalIdx,"telefone",e.target.value)} className="w-28 px-2 py-1 border rounded text-xs"/> : (l.telefone || "—")}</td>
                          <td className="px-3 py-2">{l.uf || "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{l.margemLivre ? `R$ ${l.margemLivre.toFixed(2)}` : "—"}</td>
                          <td className="px-3 py-2">{l.numeroBeneficio || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {isError && <span className="text-[9px] text-red-500 font-medium max-w-[120px] truncate" title={l._errors.join(", ")}>{l._errors[0]}</span>}
                              <div className="flex items-center justify-center gap-1 ml-auto">
                                <button onClick={() => isEditing ? confirmarEdicao(globalIdx) : setEditIdx(globalIdx)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded" title={isEditing ? "Concluir" : "Editar"}>
                                  {isEditing ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/> : <Pencil className="h-3.5 w-3.5 text-zinc-400"/>}
                                </button>
                                <button onClick={() => removerLead(globalIdx)} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" title="Remover">
                                  <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500"/>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {leads.length > porPagina && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button onClick={() => { setPagina(p => Math.max(1,p-1)); tableRef.current?.scrollTo(0,0); }} disabled={pagina===1} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 disabled:opacity-30">← Anterior</button>
                  <span className="text-xs text-zinc-500">Pág {pagina}/{Math.ceil(leads.length/porPagina)}</span>
                  <button onClick={() => { setPagina(p => Math.min(Math.ceil(leads.length/porPagina),p+1)); tableRef.current?.scrollTo(0,0); }} disabled={pagina >= Math.ceil(leads.length/porPagina)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 disabled:opacity-30">Próxima →</button>
                </div>
              )}
            </div>
            {erro && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-5 py-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-700 dark:text-red-300">{erro}</p>
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-zinc-600 flex items-center gap-1"><ArrowLeft className="h-4 w-4"/> Voltar</button>
              <button onClick={importar} disabled={importando || totalValidos === 0}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-40 transition">
                {importando ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                {importando ? "Importando..." : `Importar ${totalValidos} Propostas`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && resultado && (
          <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/5 to-emerald-500/5 p-10 text-center">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping"/>
              <div className="relative flex items-center justify-center w-full h-full">
                <CheckCircle2 className="h-12 w-12 text-brand" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-brand mb-2">Importação Concluída!</h2>
            <p className="text-zinc-500 text-sm mb-4">Carteira importada com sucesso — Propostas e Leads criados</p>
            <div className="grid grid-cols-4 gap-3 max-w-xl mx-auto mt-6">
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{resultado.importados}</p>
                <p className="text-[10px] text-zinc-500 font-medium">Propostas</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <p className="text-2xl font-bold text-blue-600 tabular-nums">{resultado.leadsImportados || 0}</p>
                <p className="text-[10px] text-zinc-500 font-medium">Leads</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <p className="text-2xl font-bold text-amber-600 tabular-nums">{resultado.atualizados || 0}</p>
                <p className="text-[10px] text-zinc-500 font-medium">Atualizados</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <p className="text-2xl font-bold text-zinc-400 tabular-nums">{resultado.pulados || 0}</p>
                <p className="text-[10px] text-zinc-500 font-medium">Pulados</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-8">
              <button onClick={() => router.push("/esteira")} className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 transition shadow-lg shadow-brand/25">
                Ver Esteira →
              </button>
              <button onClick={() => router.push("/leads")} className="px-6 py-2.5 rounded-xl border border-brand text-brand text-sm font-semibold hover:bg-brand/5 transition">
                Ver Leads
              </button>
              <button onClick={() => { setStep(1); setLeads([]); setRawRows([]); setRawHeaders([]); setResultado(null); setNomeArquivo(""); }}
                className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                Importar Mais
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
