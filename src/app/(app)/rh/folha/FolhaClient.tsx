"use client";
import { useState, useMemo } from "react";
import {
  Receipt, DollarSign, TrendingUp, ChevronDown, ChevronUp,
  Users, Building2, Info, Percent, ArrowDown, ArrowUp, Download, Printer
} from "lucide-react";
import { exportarCSV, imprimirRelatorio, gerarHoleriteHTML } from "@/lib/rh/exportacao";
import {
  calcularINSS, calcularIRRF, calcularFGTS, calcularINSSPatronal,
  calcularDescontoVT, calcularCustoTotalEmpresa, formatarMoeda, formatarPercentual
} from "@/lib/rh/calculos-trabalhistas";

type Func = {
  id: string;
  nome: string;
  cpf: string;
  cargoFuncao?: string | null;
  salarioBase?: number | null;
  valeTransporte: boolean;
  valeAlimentacao?: number | null;
  planoSaude: boolean;
  tipoJornada: string;
  horasDiarias: number;
  horasSemanais: number;
};

type Holerite = {
  func: Func;
  salarioBruto: number;
  inss: { valor: number; aliquotaEfetiva: number };
  irrf: { base: number; valor: number };
  fgts: number;
  descontoVT: number;
  totalDescontos: number;
  salarioLiquido: number;
  inssPatronal: number;
  custoTotal: ReturnType<typeof calcularCustoTotalEmpresa>;
};

export function FolhaClient({
  funcionarios,
  regimeTributario,
}: {
  funcionarios: Func[];
  regimeTributario: string;
}) {
  const [expandido, setExpandido] = useState<string | null>(null);

  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const holerites: Holerite[] = useMemo(() => {
    return funcionarios
      .filter(f => f.salarioBase && f.salarioBase > 0)
      .map(f => {
        const salarioBruto = f.salarioBase!;
        const inss = calcularINSS(salarioBruto);
        const irrf = calcularIRRF(salarioBruto, inss.valor);
        const fgts = calcularFGTS(salarioBruto);
        const descontoVT = f.valeTransporte ? calcularDescontoVT(salarioBruto) : 0;
        const inssPatronal = calcularINSSPatronal(salarioBruto, regimeTributario);

        const totalDescontos = inss.valor + irrf.valor + descontoVT;
        const salarioLiquido = Math.round((salarioBruto - totalDescontos) * 100) / 100;

        const custoTotal = calcularCustoTotalEmpresa({
          salarioBase: salarioBruto,
          valeTransporte: f.valeTransporte,
          valeAlimentacao: f.valeAlimentacao || 0,
          planoSaude: f.planoSaude,
          regimeTributario,
        });

        return { func: f, salarioBruto, inss, irrf, fgts, descontoVT, totalDescontos, salarioLiquido, inssPatronal, custoTotal };
      });
  }, [funcionarios, regimeTributario]);

  // Totais
  const totais = useMemo(() => {
    return {
      bruto: holerites.reduce((s, h) => s + h.salarioBruto, 0),
      liquido: holerites.reduce((s, h) => s + h.salarioLiquido, 0),
      inss: holerites.reduce((s, h) => s + h.inss.valor, 0),
      irrf: holerites.reduce((s, h) => s + h.irrf.valor, 0),
      fgts: holerites.reduce((s, h) => s + h.fgts, 0),
      custoTotal: holerites.reduce((s, h) => s + h.custoTotal.custoTotal, 0),
    };
  }, [holerites]);

  // Fator R (Simples Nacional)
  const fatorR = useMemo(() => {
    if (regimeTributario !== "SIMPLES_NACIONAL") return null;
    // Fator R = Folha 12 meses / Faturamento 12 meses
    // Como não temos faturamento, vamos mostrar apenas o valor da folha
    const folhaMensal = totais.bruto + totais.fgts;
    return { folhaMensal, folha12: folhaMensal * 12 };
  }, [regimeTributario, totais]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>📄 FOLHA DE PAGAMENTO</p>
            <h1 className="text-3xl font-bold tracking-tight">Folha & Holerites Projetados</h1>
            <p className="text-sm text-zinc-500 mt-1 capitalize">Projeção para {mesAtual} — {holerites.length} funcionário(s) CLT</p>
          </div>
          {holerites.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => {
                const linhas: (string|number)[][] = [["Nome","Cargo","Bruto","INSS","IRRF","VT","Líquido","FGTS","Custo Empresa"]];
                holerites.forEach(h => linhas.push([h.func.nome, h.func.cargoFuncao || "", h.salarioBruto, h.inss.valor, h.irrf.valor, h.descontoVT, h.salarioLiquido, h.fgts, h.custoTotal.custoTotal]));
                linhas.push(["TOTAL","", totais.bruto, totais.inss, totais.irrf, 0, totais.liquido, totais.fgts, totais.custoTotal]);
                exportarCSV(`folha_${mesAtual.replace(/\s/g,"_")}`, linhas);
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition"><Download className="h-3.5 w-3.5" /> CSV</button>
              <button onClick={() => {
                const htmlParts = holerites.map(h => gerarHoleriteHTML(
                  h.func, mesAtual,
                  [{ label: "Salário Base", valor: h.salarioBruto }],
                  [{ label: `INSS (${formatarPercentual(h.inss.aliquotaEfetiva)})`, valor: h.inss.valor }, { label: "IRRF", valor: h.irrf.valor }, { label: "Vale Transporte", valor: h.descontoVT }],
                  h.salarioBruto, h.totalDescontos, h.salarioLiquido
                ));
                imprimirRelatorio("Folha de Pagamento", htmlParts.join('<hr style="margin:24px 0">'));
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition"><Printer className="h-3.5 w-3.5" /> Imprimir</button>
            </div>
          )}
        </div>

        {/* Totais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <TotalCard label="Salário Bruto" value={formatarMoeda(totais.bruto)} icon={<DollarSign className="h-4 w-4" />} color="bg-zinc-100 dark:bg-zinc-800" />
          <TotalCard label="INSS (Empregado)" value={formatarMoeda(totais.inss)} icon={<ArrowDown className="h-4 w-4" />} color="bg-red-50 dark:bg-red-950/30" sub="desconto" />
          <TotalCard label="IRRF" value={formatarMoeda(totais.irrf)} icon={<ArrowDown className="h-4 w-4" />} color="bg-red-50 dark:bg-red-950/30" sub="desconto" />
          <TotalCard label="Salário Líquido" value={formatarMoeda(totais.liquido)} icon={<ArrowUp className="h-4 w-4" />} color="bg-emerald-50 dark:bg-emerald-950/30" />
          <TotalCard label="FGTS (8%)" value={formatarMoeda(totais.fgts)} icon={<Building2 className="h-4 w-4" />} color="bg-blue-50 dark:bg-blue-950/30" sub="patronal" />
          <TotalCard label="Custo Total Empresa" value={formatarMoeda(totais.custoTotal)} icon={<TrendingUp className="h-4 w-4" />} color="bg-purple-50 dark:bg-purple-950/30" />
        </div>

        {/* Fator R */}
        {fatorR && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4" /> Fator R — Simples Nacional
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Folha Mensal</p>
                <p className="font-bold">{formatarMoeda(fatorR.folhaMensal)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Folha 12 Meses (projeção)</p>
                <p className="font-bold">{formatarMoeda(fatorR.folha12)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Regra</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Se Fator R ≥ 28%, a empresa pode se enquadrar no Anexo III (alíquota mais baixa) ao invés do Anexo V.</p>
              </div>
            </div>
          </div>
        )}

        {/* Holerites individuais */}
        {holerites.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Nenhum funcionário CLT com salário cadastrado</p>
            <p className="text-sm text-zinc-400 mt-1">Cadastre funcionários CLT com salário base para gerar a folha projetada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Holerites Individuais</h3>
            {holerites.map(h => {
              const isOpen = expandido === h.func.id;
              return (
                <div key={h.func.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                  <button
                    onClick={() => setExpandido(isOpen ? null : h.func.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition"
                  >
                    <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                      {h.func.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{h.func.nome}</p>
                      <p className="text-xs text-zinc-400">{h.func.cargoFuncao || "—"}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm tabular-nums">
                      <div className="text-center">
                        <p className="text-[9px] text-zinc-400 uppercase">Bruto</p>
                        <p className="font-semibold">{formatarMoeda(h.salarioBruto)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-zinc-400 uppercase">Descontos</p>
                        <p className="font-semibold text-red-500">-{formatarMoeda(h.totalDescontos)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-zinc-400 uppercase">Líquido</p>
                        <p className="font-bold text-emerald-600">{formatarMoeda(h.salarioLiquido)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-zinc-400 uppercase">Custo Empresa</p>
                        <p className="font-semibold text-purple-600">{formatarMoeda(h.custoTotal.custoTotal)}</p>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="grid grid-cols-2 gap-6 mt-4">
                        {/* Proventos */}
                        <div>
                          <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" /> Proventos
                          </h4>
                          <div className="space-y-2">
                            <HoleriteRow label="Salário Base" value={h.salarioBruto} />
                            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
                              <HoleriteRow label="Total Proventos" value={h.salarioBruto} bold />
                            </div>
                          </div>
                        </div>

                        {/* Descontos */}
                        <div>
                          <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <ArrowDown className="h-3 w-3" /> Descontos
                          </h4>
                          <div className="space-y-2">
                            <HoleriteRow label={`INSS (${formatarPercentual(h.inss.aliquotaEfetiva)} efetiva)`} value={h.inss.valor} negative />
                            {h.irrf.valor > 0 && <HoleriteRow label="IRRF" value={h.irrf.valor} negative />}
                            {h.descontoVT > 0 && <HoleriteRow label="Vale Transporte (6%)" value={h.descontoVT} negative />}
                            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
                              <HoleriteRow label="Total Descontos" value={h.totalDescontos} bold negative />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Líquido */}
                      <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
                        <span className="font-semibold text-sm">Salário Líquido</span>
                        <span className="text-xl font-black text-emerald-600 tabular-nums">{formatarMoeda(h.salarioLiquido)}</span>
                      </div>

                      {/* Encargos Patronais */}
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Encargos Patronais (Custo da Empresa)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <EncargoCaixa label="FGTS (8%)" value={h.custoTotal.fgts} />
                          <EncargoCaixa label="INSS Patronal" value={h.custoTotal.inssPatronal} />
                          <EncargoCaixa label="Provisão 13º" value={h.custoTotal.provisao13} />
                          <EncargoCaixa label="Provisão Férias" value={h.custoTotal.provisaoFerias} />
                        </div>
                        <div className="mt-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 p-4 flex items-center justify-between">
                          <span className="font-semibold text-sm">Custo Total p/ Empresa</span>
                          <span className="text-xl font-black text-purple-600 tabular-nums">{formatarMoeda(h.custoTotal.custoTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TotalCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className={`rounded-xl ${color} p-4`}>
      <div className="flex items-center gap-1.5 text-zinc-400 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[9px] text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function HoleriteRow({ label, value, bold, negative }: { label: string; value: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-semibold" : "text-zinc-600 dark:text-zinc-400"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold" : ""} ${negative ? "text-red-500" : ""}`}>
        {negative ? "-" : ""}{formatarMoeda(value)}
      </span>
    </div>
  );
}

function EncargoCaixa({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-purple-100/50 dark:bg-purple-900/20 p-3 text-center">
      <p className="text-[10px] text-zinc-500 font-semibold uppercase">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-1">{formatarMoeda(value)}</p>
    </div>
  );
}
