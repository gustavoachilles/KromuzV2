"use client";
import { useState, useMemo } from "react";
import { Calendar, Clock, AlertTriangle, CheckCircle2, FileText, ChevronDown, Coffee, Download, Printer } from "lucide-react";
import { exportarCSV, imprimirRelatorio, gerarEspelhoPontoHTML } from "@/lib/rh/exportacao";

type FuncResumo = { id: string; nome: string; cargoFuncao?: string | null; tipoJornada: string; horasDiarias: number; horasSemanais: number; salarioBase?: number | null };
type Pausa = { id: string; tipoPausa: string; cumprida: boolean };
type Registro = { id: string; funcionarioId: string; data: string; entrada?: string | null; saidaAlmoco?: string | null; retornoAlmoco?: string | null; saida?: string | null; horasTrabalhadas?: number | null; horasExtras?: number | null; falta: boolean; justificativa?: string | null; pausas: Pausa[] };

function fmtHora(iso?: string | null) { return iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"; }
function fmtData(iso: string) { return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); }

export function EspelhoClient({ funcionarios, registros, mesAtual, anoAtual }: { funcionarios: FuncResumo[]; registros: Registro[]; mesAtual: number; anoAtual: number }) {
  const [selFunc, setSelFunc] = useState(funcionarios[0]?.id || "");
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const func = funcionarios.find(f => f.id === selFunc);
  const regs = useMemo(() => registros.filter(r => r.funcionarioId === selFunc).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()), [registros, selFunc]);

  const resumo = useMemo(() => {
    const totalHoras = regs.reduce((s, r) => s + (r.horasTrabalhadas || 0), 0);
    const totalExtras = regs.reduce((s, r) => s + (r.horasExtras || 0), 0);
    const faltas = regs.filter(r => r.falta).length;
    const diasTrabalhados = regs.filter(r => r.entrada).length;
    const atrasos = regs.filter(r => r.entrada && !r.falta).length; // simplified
    const pausasNr17 = regs.reduce((s, r) => s + r.pausas.filter(p => p.cumprida).length, 0);
    const pausasTotal = regs.reduce((s, r) => s + r.pausas.length, 0);
    return { totalHoras: Math.round(totalHoras * 100) / 100, totalExtras: Math.round(totalExtras * 100) / 100, faltas, diasTrabalhados, pausasNr17, pausasTotal };
  }, [regs]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>📋 ESPELHO DE PONTO</p>
          <h1 className="text-3xl font-bold tracking-tight">Espelho de Ponto Mensal</h1>
          <p className="text-sm text-zinc-500 mt-1 capitalize">{meses[mesAtual - 1]} {anoAtual}</p>
        </div>

        {/* Seletor de funcionário */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium">Funcionário:</label>
          <div className="relative">
            <select value={selFunc} onChange={e => setSelFunc(e.target.value)} className="appearance-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 pr-10 text-sm font-medium min-w-[280px]">
              {funcionarios.map(f => (<option key={f.id} value={f.id}>{f.nome} — {f.cargoFuncao || "Sem cargo"}</option>))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          </div>
          {func && regs.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <button onClick={() => {
                const linhas: (string|number)[][] = [["Data","Entrada","Almoço","Retorno","Saída","Horas","Extras","Falta"]];
                regs.forEach(r => linhas.push([fmtData(r.data), fmtHora(r.entrada), fmtHora(r.saidaAlmoco), fmtHora(r.retornoAlmoco), fmtHora(r.saida), r.horasTrabalhadas?.toFixed(1) || "—", r.horasExtras?.toFixed(1) || "—", r.falta ? "SIM" : ""]));
                linhas.push(["TOTAL","","","","", resumo.totalHoras.toFixed(1), resumo.totalExtras.toFixed(1), String(resumo.faltas)]);
                exportarCSV(`espelho_${func.nome.replace(/\s/g,"_")}_${meses[mesAtual-1]}_${anoAtual}`, linhas);
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition"><Download className="h-3.5 w-3.5" /> CSV</button>
              <button onClick={() => {
                const html = gerarEspelhoPontoHTML(func, `${meses[mesAtual-1]} ${anoAtual}`, regs, resumo);
                imprimirRelatorio(`Espelho de Ponto — ${func.nome}`, html);
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition"><Printer className="h-3.5 w-3.5" /> Imprimir</button>
            </div>
          )}
        </div>

        {func && (
          <>
            {/* KPIs do mês */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{resumo.diasTrabalhados}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Dias Trabalhados</p>
              </div>
              <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 text-center">
                <p className="text-2xl font-bold">{resumo.totalHoras.toFixed(1)}h</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Horas</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${resumo.totalExtras > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                <p className={`text-2xl font-bold ${resumo.totalExtras > 0 ? "text-amber-600" : "text-zinc-400"}`}>{resumo.totalExtras.toFixed(1)}h</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Horas Extras</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${resumo.faltas > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                <p className={`text-2xl font-bold ${resumo.faltas > 0 ? "text-red-600" : "text-zinc-400"}`}>{resumo.faltas}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Faltas</p>
              </div>
              {func.tipoJornada === "TELEMARKETING_6H" && (
                <div className={`rounded-xl p-4 text-center ${resumo.pausasNr17 < resumo.pausasTotal ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"}`}>
                  <p className="text-2xl font-bold">{resumo.pausasNr17}/{resumo.pausasTotal}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pausas NR-17</p>
                </div>
              )}
            </div>

            {/* Info do funcionário */}
            <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 flex items-center gap-6 text-sm">
              <div><span className="text-zinc-400 text-xs">Jornada:</span> <span className="font-medium">{func.horasDiarias}h/dia · {func.horasSemanais}h/sem</span></div>
              <div><span className="text-zinc-400 text-xs">Tipo:</span> <span className="font-medium">{func.tipoJornada === "TELEMARKETING_6H" ? "Telemarketing (NR-17)" : func.tipoJornada === "ESTAGIO_6H" ? "Estágio" : "Padrão"}</span></div>
              {func.salarioBase && <div><span className="text-zinc-400 text-xs">Hora Normal:</span> <span className="font-medium">R$ {(func.salarioBase / (func.horasSemanais <= 36 ? 180 : 220)).toFixed(2)}</span></div>}
            </div>

            {/* Tabela espelho */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="hidden md:grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.6fr_1fr] gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                <span>Data</span><span>Entrada</span><span>Almoço</span><span>Retorno</span><span>Saída</span><span>Horas</span><span>Extras</span><span>Status</span><span>NR-17</span>
              </div>
              <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {regs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">Nenhum registro de ponto neste mês</div>
                ) : regs.map(r => {
                  const isExtra = (r.horasExtras || 0) > 0;
                  const isTele = func.tipoJornada === "TELEMARKETING_6H";
                  const p1 = r.pausas.find(p => p.tipoPausa === "PAUSA_10MIN_1");
                  const p2 = r.pausas.find(p => p.tipoPausa === "PAUSA_10MIN_2");
                  const ref = r.pausas.find(p => p.tipoPausa === "REFEICAO_20MIN");

                  return (
                    <div key={r.id} className={`grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.6fr_1fr] gap-2 items-center px-4 py-2.5 text-sm ${r.falta ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}>
                      <span className="font-medium text-xs capitalize">{fmtData(r.data)}</span>
                      <span className="tabular-nums text-xs">{fmtHora(r.entrada)}</span>
                      <span className="tabular-nums text-xs">{fmtHora(r.saidaAlmoco)}</span>
                      <span className="tabular-nums text-xs">{fmtHora(r.retornoAlmoco)}</span>
                      <span className="tabular-nums text-xs">{fmtHora(r.saida)}</span>
                      <span className="tabular-nums text-xs font-medium">{r.horasTrabalhadas ? `${r.horasTrabalhadas.toFixed(1)}h` : "—"}</span>
                      <span className={`tabular-nums text-xs font-semibold ${isExtra ? "text-amber-600" : "text-zinc-300"}`}>{isExtra ? `+${r.horasExtras!.toFixed(1)}h` : "—"}</span>
                      <span>{r.falta
                        ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold">FALTA</span>
                        : r.saida
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : r.entrada
                            ? <Clock className="h-3.5 w-3.5 text-blue-500" />
                            : <span className="text-zinc-300">—</span>
                      }</span>
                      <span className="flex gap-1">
                        {isTele ? (
                          <>
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${p1?.cumprida ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>P1</span>
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${p2?.cumprida ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>P2</span>
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${ref?.cumprida ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>R</span>
                          </>
                        ) : <span className="text-[10px] text-zinc-300">N/A</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Totais */}
              {regs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.6fr_1fr] gap-2 items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 text-xs font-bold">
                  <span>TOTAL</span><span></span><span></span><span></span><span></span>
                  <span className="tabular-nums">{resumo.totalHoras.toFixed(1)}h</span>
                  <span className="tabular-nums text-amber-600">{resumo.totalExtras > 0 ? `+${resumo.totalExtras.toFixed(1)}h` : "—"}</span>
                  <span></span><span></span>
                </div>
              )}
            </div>
          </>
        )}

        {funcionarios.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Nenhum funcionário elegível</p>
          </div>
        )}
      </div>
    </div>
  );
}
