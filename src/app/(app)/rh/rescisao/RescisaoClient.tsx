"use client";
import { useState, useMemo } from "react";
import { Calculator, ChevronDown, DollarSign, ArrowUp, ArrowDown, AlertTriangle, Download } from "lucide-react";
import { calcularRescisao, formatarMoeda, type CalculoRescisao } from "@/lib/rh/calculos-trabalhistas";

type Func = { id: string; nome: string; cpf: string; cargoFuncao?: string | null; salarioBase?: number | null; dataAdmissao?: string | null };

const TIPOS_RESCISAO = [
  { value: "SEM_JUSTA_CAUSA", label: "Demissão Sem Justa Causa", desc: "Empregador demite. Paga aviso prévio, multa FGTS 40%, férias, 13º." },
  { value: "PEDIDO_DEMISSAO", label: "Pedido de Demissão", desc: "Empregado pede. Sem multa FGTS, sem saque FGTS, sem seguro desemprego." },
  { value: "JUSTA_CAUSA", label: "Demissão por Justa Causa", desc: "Falta grave. Só recebe saldo salário e férias vencidas." },
  { value: "ACORDO_MUTUO", label: "Acordo Mútuo (Reforma)", desc: "Lei 13.467/2017. Multa FGTS 20%, saque 80% FGTS, aviso prévio 50%." },
];

export function RescisaoClient({ funcionarios }: { funcionarios: Func[] }) {
  const [selFunc, setSelFunc] = useState(funcionarios[0]?.id || "");
  const [tipoRescisao, setTipoRescisao] = useState<"SEM_JUSTA_CAUSA" | "PEDIDO_DEMISSAO" | "JUSTA_CAUSA" | "ACORDO_MUTUO">("SEM_JUSTA_CAUSA");
  const [dataRescisao, setDataRescisao] = useState(new Date().toISOString().split("T")[0]);
  const [diasTrabalhados, setDiasTrabalhados] = useState("15");
  const [feriasVencidas, setFeriasVencidas] = useState("0");
  const [avisoCumprido, setAvisoCumprido] = useState(false);

  const func = funcionarios.find(f => f.id === selFunc);

  const resultado = useMemo((): CalculoRescisao | null => {
    if (!func?.salarioBase || !func?.dataAdmissao) return null;
    return calcularRescisao({
      salarioBase: func.salarioBase,
      dataAdmissao: new Date(func.dataAdmissao),
      dataRescisao: new Date(dataRescisao),
      tipoRescisao,
      diasTrabalhadosMes: parseInt(diasTrabalhados) || 15,
      feriasVencidasPeriodos: parseInt(feriasVencidas) || 0,
      avisoPrevioCumprido: avisoCumprido,
    });
  }, [func, tipoRescisao, dataRescisao, diasTrabalhados, feriasVencidas, avisoCumprido]);

  const tipoInfo = TIPOS_RESCISAO.find(t => t.value === tipoRescisao);

  function exportarCSV() {
    if (!resultado || !func) return;
    const linhas = [
      ["Simulação de Rescisão - KROMUZ"],
      ["Funcionário", func.nome],
      ["CPF", func.cpf],
      ["Tipo", tipoInfo?.label || ""],
      ["Data Rescisão", dataRescisao],
      [""],
      ["PROVENTOS", "Valor"],
      ["Saldo de Salário", resultado.saldoSalario.toFixed(2)],
      ["Aviso Prévio Indenizado", resultado.avisoPrevio.toFixed(2)],
      ["Férias Vencidas", resultado.feriasVencidas.toFixed(2)],
      ["Férias Proporcionais", resultado.feriasProporcionais.toFixed(2)],
      ["1/3 Constitucional", resultado.tercoFerias.toFixed(2)],
      ["13º Proporcional", resultado.decimoTerceiroProporcional.toFixed(2)],
      ["Multa FGTS", resultado.multaFgts.toFixed(2)],
      ["Total Bruto", resultado.totalBruto.toFixed(2)],
      [""],
      ["DESCONTOS", "Valor"],
      ["INSS", resultado.descontoINSS.toFixed(2)],
      ["IRRF", resultado.descontoIRRF.toFixed(2)],
      ["Desconto Aviso Prévio", resultado.descontoAvisoPrevio.toFixed(2)],
      ["Total Descontos", resultado.totalDescontos.toFixed(2)],
      [""],
      ["TOTAL LÍQUIDO", resultado.totalLiquido.toFixed(2)],
    ];
    const csv = linhas.map(l => l.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rescisao_${func.nome.replace(/\s/g, "_")}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>⚖️ SIMULADOR DE RESCISÃO</p>
          <h1 className="text-3xl font-bold tracking-tight">Cálculo de Verbas Rescisórias</h1>
          <p className="text-sm text-zinc-500 mt-1">Simule os custos de demissão conforme CLT e Reforma Trabalhista (Lei 13.467/2017)</p>
        </div>

        {/* Formulário */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Funcionário</label>
              <div className="relative">
                <select value={selFunc} onChange={e => setSelFunc(e.target.value)} className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 pr-10 text-sm">
                  {funcionarios.map(f => (<option key={f.id} value={f.id}>{f.nome} — {f.cargoFuncao || "Sem cargo"}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
              {func && <p className="text-[10px] text-zinc-400">Salário: {formatarMoeda(func.salarioBase || 0)} · Admissão: {func.dataAdmissao ? new Date(func.dataAdmissao).toLocaleDateString("pt-BR") : "N/A"}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo de Rescisão</label>
              <div className="relative">
                <select value={tipoRescisao} onChange={e => setTipoRescisao(e.target.value as typeof tipoRescisao)} className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 pr-10 text-sm">
                  {TIPOS_RESCISAO.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
              <p className="text-[10px] text-zinc-400">{tipoInfo?.desc}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Data da Rescisão</label>
              <input type="date" value={dataRescisao} onChange={e => setDataRescisao(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Dias Trabalhados no Mês</label>
              <input type="number" min="0" max="31" value={diasTrabalhados} onChange={e => setDiasTrabalhados(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Períodos Férias Vencidas</label>
              <input type="number" min="0" max="5" value={feriasVencidas} onChange={e => setFeriasVencidas(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Aviso Prévio</label>
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={avisoCumprido} onChange={e => setAvisoCumprido(e.target.checked)} className="rounded" />
                <span className="text-sm">Cumprido</span>
              </label>
            </div>
          </div>
        </div>

        {/* Resultado */}
        {resultado && func && (
          <div className="space-y-4">
            {/* Total */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 p-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Total Líquido a Pagar</p>
                <p className="text-4xl font-black text-emerald-600 tabular-nums mt-1">{formatarMoeda(resultado.totalLiquido)}</p>
                <p className="text-xs text-zinc-500 mt-1">Bruto: {formatarMoeda(resultado.totalBruto)} − Descontos: {formatarMoeda(resultado.totalDescontos)}</p>
              </div>
              <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition">
                <Download className="h-4 w-4" /> Exportar CSV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Proventos */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold text-emerald-600 flex items-center gap-2 mb-4"><ArrowUp className="h-4 w-4" /> Proventos</h3>
                <div className="space-y-2">
                  <Row label="Saldo de Salário" sub={`${diasTrabalhados} dias`} value={resultado.saldoSalario} />
                  {resultado.avisoPrevio > 0 && <Row label="Aviso Prévio Indenizado" sub={`${resultado.avisoPrevioDias} dias (Lei 12.506)`} value={resultado.avisoPrevio} />}
                  {resultado.feriasVencidas > 0 && <Row label="Férias Vencidas" sub={`${feriasVencidas} período(s)`} value={resultado.feriasVencidas} />}
                  {resultado.feriasProporcionais > 0 && <Row label="Férias Proporcionais" value={resultado.feriasProporcionais} />}
                  {resultado.tercoFerias > 0 && <Row label="1/3 Constitucional Férias" value={resultado.tercoFerias} />}
                  {resultado.decimoTerceiroProporcional > 0 && <Row label="13º Salário Proporcional" value={resultado.decimoTerceiroProporcional} />}
                  {resultado.multaFgts > 0 && <Row label={`Multa FGTS (${tipoRescisao === "ACORDO_MUTUO" ? "20%" : "40%"})`} sub={`Saldo FGTS: ${formatarMoeda(resultado.saldoFgts)}`} value={resultado.multaFgts} />}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
                    <Row label="TOTAL BRUTO" value={resultado.totalBruto} bold />
                  </div>
                </div>
              </div>

              {/* Descontos */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2 mb-4"><ArrowDown className="h-4 w-4" /> Descontos</h3>
                <div className="space-y-2">
                  {resultado.descontoINSS > 0 && <Row label="INSS" value={resultado.descontoINSS} negative />}
                  {resultado.descontoIRRF > 0 && <Row label="IRRF" value={resultado.descontoIRRF} negative />}
                  {resultado.descontoAvisoPrevio > 0 && <Row label="Aviso Prévio (não cumprido)" sub="30 dias descontados" value={resultado.descontoAvisoPrevio} negative />}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
                    <Row label="TOTAL DESCONTOS" value={resultado.totalDescontos} bold negative />
                  </div>
                </div>

                {/* Info FGTS */}
                <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 p-3">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">FGTS — Informações</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Saldo estimado: {formatarMoeda(resultado.saldoFgts)}<br />
                    {tipoRescisao === "SEM_JUSTA_CAUSA" && "✅ Saque total + Seguro Desemprego"}
                    {tipoRescisao === "ACORDO_MUTUO" && "⚠️ Saque de 80% do saldo. Sem Seguro Desemprego."}
                    {tipoRescisao === "PEDIDO_DEMISSAO" && "❌ Sem saque. Sem Seguro Desemprego."}
                    {tipoRescisao === "JUSTA_CAUSA" && "❌ Sem saque. Sem Seguro Desemprego."}
                  </p>
                </div>

                {tipoRescisao === "JUSTA_CAUSA" && (
                  <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/20 p-3">
                    <p className="text-xs text-red-600 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      Justa Causa: o empregado perde férias proporcionais, 13º proporcional, aviso prévio, multa FGTS e seguro desemprego. Mantém apenas saldo de salário e férias vencidas.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Prazo legal */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Prazo Legal (Art. 477 CLT)</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">O pagamento das verbas rescisórias deve ser feito em até <strong>10 dias corridos</strong> após o término do contrato, sob pena de multa equivalente ao salário do empregado.</p>
            </div>
          </div>
        )}

        {funcionarios.length === 0 && (
          <div className="text-center py-16">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Nenhum funcionário CLT ativo</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, sub, value, bold, negative }: { label: string; sub?: string; value: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-sm ${bold ? "font-bold" : "text-zinc-600 dark:text-zinc-400"}`}>{label}</p>
        {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
      </div>
      <p className={`text-sm tabular-nums ${bold ? "font-bold" : ""} ${negative ? "text-red-500" : ""}`}>
        {negative ? "−" : ""}{formatarMoeda(value)}
      </p>
    </div>
  );
}
