"use client";
import { useState, useMemo } from "react";
import { FileText, Upload, Search, User, AlertTriangle, CheckCircle2, X, Eye, Trash2, Shield, Calendar, Download } from "lucide-react";

type Doc = { id: string; funcionarioId: string; tipo: string; nome: string; url: string; tamanhoBytes?: number | null; mimeType?: string | null; dataValidade?: string | null; assinado: boolean; dataAssinatura?: string | null; createdAt: string };
type Func = { id: string; nome: string; cpf: string; cargoFuncao?: string | null; regimeContratacao: string; documentos: Doc[] };

const TIPOS_DOC = ["RG", "CPF", "CTPS", "COMPROVANTE_RESIDENCIA", "CONTRATO", "LAUDO_MEDICO", "CERTIDAO", "ASO", "OUTROS"];
const TIPO_LABELS: Record<string, string> = { RG: "RG", CPF: "CPF", CTPS: "CTPS", COMPROVANTE_RESIDENCIA: "Comprovante de Residência", CONTRATO: "Contrato de Trabalho", LAUDO_MEDICO: "Laudo Médico", CERTIDAO: "Certidão", ASO: "ASO (Atestado Saúde)", OUTROS: "Outros" };
const DOCS_OBRIGATORIOS_CLT = ["RG", "CPF", "CTPS", "COMPROVANTE_RESIDENCIA", "CONTRATO", "ASO"];
const DOCS_OBRIGATORIOS_PJ = ["CPF", "CONTRATO"];

function fmtDate(d?: string | null) { return d ? new Date(d).toLocaleDateString("pt-BR") : "—"; }
function fmtSize(bytes?: number | null) { if (!bytes) return "—"; if (bytes < 1024) return `${bytes}B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`; return `${(bytes / 1048576).toFixed(1)}MB`; }

export function DocumentosClient({ funcionarios, empresaId }: { funcionarios: Func[]; empresaId: string }) {
  const [filtro, setFiltro] = useState("");
  const [selFunc, setSelFunc] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    if (!filtro) return funcionarios;
    const q = filtro.toLowerCase();
    return funcionarios.filter(f => f.nome.toLowerCase().includes(q) || f.cpf.includes(q));
  }, [funcionarios, filtro]);

  const resumo = useMemo(() => {
    let completos = 0, pendentes = 0, vencidos = 0;
    for (const f of funcionarios) {
      const obrigatorios = f.regimeContratacao === "CLT" ? DOCS_OBRIGATORIOS_CLT : f.regimeContratacao === "PJ" ? DOCS_OBRIGATORIOS_PJ : [];
      const tiposExistentes = new Set(f.documentos.map(d => d.tipo));
      const faltantes = obrigatorios.filter(t => !tiposExistentes.has(t));
      if (faltantes.length === 0) completos++; else pendentes++;
      vencidos += f.documentos.filter(d => d.dataValidade && new Date(d.dataValidade) < new Date()).length;
    }
    return { completos, pendentes, vencidos };
  }, [funcionarios]);

  const funcSel = selFunc ? funcionarios.find(f => f.id === selFunc) : null;

  function getDocStatus(func: Func) {
    const obrigatorios = func.regimeContratacao === "CLT" ? DOCS_OBRIGATORIOS_CLT : func.regimeContratacao === "PJ" ? DOCS_OBRIGATORIOS_PJ : [];
    const tiposExistentes = new Set(func.documentos.map(d => d.tipo));
    const faltantes = obrigatorios.filter(t => !tiposExistentes.has(t));
    const vencidos = func.documentos.filter(d => d.dataValidade && new Date(d.dataValidade) < new Date());
    return { faltantes, vencidos, total: func.documentos.length, completo: faltantes.length === 0 };
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>📁 GESTÃO DOCUMENTAL</p>
          <h1 className="text-3xl font-bold tracking-tight">Documentos dos Funcionários</h1>
          <p className="text-sm text-zinc-500 mt-1">Controle de documentos obrigatórios, vencimentos e conformidade</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-xl p-4 text-center ${resumo.pendentes > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"}`}>
            <p className={`text-2xl font-bold ${resumo.pendentes > 0 ? "text-amber-600" : "text-emerald-600"}`}>{resumo.pendentes > 0 ? resumo.pendentes : resumo.completos}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{resumo.pendentes > 0 ? "Docs Pendentes" : "Completos"}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{resumo.completos}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Dossiês Completos</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${resumo.vencidos > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
            <p className={`text-2xl font-bold ${resumo.vencidos > 0 ? "text-red-600" : "text-zinc-400"}`}>{resumo.vencidos}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Docs Vencidos</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text" placeholder="Buscar funcionário..." value={filtro} onChange={e => setFiltro(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de funcionários */}
          <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
            {filtrados.map(f => {
              const st = getDocStatus(f);
              return (
                <button key={f.id} onClick={() => setSelFunc(f.id)} className={`w-full text-left rounded-xl p-3 border transition ${selFunc === f.id ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">{f.nome.substring(0, 2).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{f.nome}</p>
                      <p className="text-[10px] text-zinc-400">{f.regimeContratacao} · {st.total} doc(s)</p>
                    </div>
                    {st.completo
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    }
                  </div>
                  {st.faltantes.length > 0 && (
                    <p className="text-[9px] text-amber-600 mt-1.5 pl-12">Faltam: {st.faltantes.map(t => TIPO_LABELS[t] || t).join(", ")}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detalhe */}
          <div className="lg:col-span-2">
            {funcSel ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500">{funcSel.nome.substring(0, 2).toUpperCase()}</div>
                    <div>
                      <h3 className="font-semibold">{funcSel.nome}</h3>
                      <p className="text-xs text-zinc-400">{funcSel.cargoFuncao || "—"} · {funcSel.regimeContratacao}</p>
                    </div>
                  </div>
                  {/* Checklist */}
                  {(() => {
                    const st = getDocStatus(funcSel);
                    const obrigatorios = funcSel.regimeContratacao === "CLT" ? DOCS_OBRIGATORIOS_CLT : funcSel.regimeContratacao === "PJ" ? DOCS_OBRIGATORIOS_PJ : [];
                    const tiposExistentes = new Set(funcSel.documentos.map(d => d.tipo));
                    return obrigatorios.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {obrigatorios.map(t => (
                          <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${tiposExistentes.has(t) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : "bg-red-50 text-red-700 dark:bg-red-950/40"}`}>
                            {tiposExistentes.has(t) ? <CheckCircle2 className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                            {TIPO_LABELS[t] || t}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Lista de documentos */}
                {funcSel.documentos.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                    <p className="text-sm text-zinc-500">Nenhum documento cadastrado</p>
                    <p className="text-xs text-zinc-400 mt-1">Use a API ou o sistema de upload para adicionar documentos</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {funcSel.documentos.map(doc => {
                      const isVencido = doc.dataValidade && new Date(doc.dataValidade) < new Date();
                      return (
                        <div key={doc.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isVencido ? "bg-red-100 dark:bg-red-900/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            <FileText className={`h-4 w-4 ${isVencido ? "text-red-500" : "text-zinc-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.nome}</p>
                            <p className="text-[10px] text-zinc-400">
                              {TIPO_LABELS[doc.tipo] || doc.tipo} · {fmtSize(doc.tamanhoBytes)} · {fmtDate(doc.createdAt)}
                              {doc.dataValidade && <span className={isVencido ? " text-red-500 font-semibold" : ""}> · Validade: {fmtDate(doc.dataValidade)}{isVencido ? " (VENCIDO)" : ""}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.assinado && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 font-semibold flex items-center gap-0.5"><Shield className="h-2.5 w-2.5" /> Assinado</span>}
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:bg-blue-50 transition"><Eye className="h-3.5 w-3.5" /></a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-16 text-center">
                <User className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm text-zinc-500">Selecione um funcionário para ver seus documentos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
