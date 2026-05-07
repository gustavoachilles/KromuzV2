"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Building2,
} from "lucide-react";

type Regra = {
  id: string;
  bancoNome: string;
  produtoNome: string;
  tipoOperacao: string;
  ativa: boolean;
  prioridade: number;
  taxaMinimaAm: number | null;
  taxaMaximaAm: number | null;
  margemPadraoPct: number | null;
  margemLoasPct: number | null;
  margemNovaValorMin: number | null;
  margemNovaValorMax: number | null;
  refinParcelasMinPagas: number | null;
  refinTrocoMin: number | null;
  portParcelasMinPagas: number | null;
  portValorMin: number | null;
  portMaxContratosUnica: number | null;
  limiteCartaoMinimo: number | null;
  limiteCartaoMaximo: number | null;
  fatorRmc: number | null;
  trocoMinimoLiberado: number | null;
  saldoDevedorMaximo: number | null;
  versaoRoteiro: string | null;
  observacoes: string | null;
  fonteTipo: string | null;
  banco: { id: string; nome: string };
  produto: { id: string; nomeProduto: string; tipoProduto: string };
  importacaoPdf: { id: string; nomeArquivo: string; createdAt: string | Date } | null;
};

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova",
  REFINANCIAMENTO: "Refinanciamento",
  PORTABILIDADE: "Portabilidade",
  PORTABILIDADE_REFIN: "Port + Refin",
  CARTAO_CONSIGNADO: "Cartão Consignado",
  CARTAO_BENEFICIO: "Cartão Benefício",
};

const tipoColor: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  REFINANCIAMENTO: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  PORTABILIDADE: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  PORTABILIDADE_REFIN: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  CARTAO_CONSIGNADO: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-400",
  CARTAO_BENEFICIO: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
};

export function RegrasClient({
  regras: regrasIniciais,
  bancos,
  filtros,
}: {
  regras: Regra[];
  bancos: { id: string; nome: string }[];
  filtros: { importacao?: string; banco?: string };
}) {
  const router = useRouter();
  const [regras, setRegras] = useState(regrasIniciais);
  const [busca, setBusca] = useState("");
  const [filtroBanco, setFiltroBanco] = useState(filtros.banco || "");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [salvoOk, setSalvoOk] = useState<string | null>(null);

  const filtradas = regras.filter((r) => {
    const termoBusca = busca.toLowerCase();
    const matchBusca =
      !busca ||
      r.bancoNome.toLowerCase().includes(termoBusca) ||
      r.produtoNome.toLowerCase().includes(termoBusca) ||
      tipoLabel[r.tipoOperacao]?.toLowerCase().includes(termoBusca);
    const matchBanco = !filtroBanco || r.banco.id === filtroBanco;
    return matchBusca && matchBanco;
  });

  async function toggleAtiva(id: string, valor: boolean) {
    await fetch(`/api/regras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa: valor }),
    });
    setRegras((prev) => prev.map((r) => (r.id === id ? { ...r, ativa: valor } : r)));
  }

  async function salvarCampo(id: string, campo: string, valor: any) {
    setSalvando(id);
    await fetch(`/api/regras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    });
    setRegras((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
    setSalvando(null);
    setSalvoOk(id);
    setTimeout(() => setSalvoOk(null), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">
              Regras de Crédito
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Regras de Crédito
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {filtradas.length} regra{filtradas.length !== 1 ? "s" : ""} encontrada{filtradas.length !== 1 ? "s" : ""}
            {filtros.importacao && " (filtrado por importação)"}
          </p>
        </header>

        {/* Filtros */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por banco, produto ou tipo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <select
              value={filtroBanco}
              onChange={(e) => setFiltroBanco(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none"
            >
              <option value="">Todos os Bancos</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Regras */}
        {filtradas.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhuma regra encontrada</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Importe roteiros no Motor de Regras para extrair regras automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map((regra) => {
              const aberta = expandida === regra.id;
              return (
                <div
                  key={regra.id}
                  className={`rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-all overflow-hidden ${
                    regra.ativa
                      ? "border-zinc-200 dark:border-zinc-800"
                      : "border-zinc-200/50 dark:border-zinc-800/50 opacity-60"
                  }`}
                >
                  {/* Header da regra */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition"
                    onClick={() => setExpandida(aberta ? null : regra.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAtiva(regra.id, !regra.ativa);
                      }}
                      className="shrink-0"
                    >
                      {regra.ativa ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-zinc-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {regra.bancoNome}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-600">·</span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {regra.produtoNome}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor[regra.tipoOperacao] || "bg-zinc-100 text-zinc-600"}`}>
                          {tipoLabel[regra.tipoOperacao] || regra.tipoOperacao}
                        </span>
                        {regra.versaoRoteiro && (
                          <span className="text-[10px] text-zinc-400">v{regra.versaoRoteiro}</span>
                        )}
                        {regra.fonteTipo && (
                          <span className="text-[10px] text-zinc-400 uppercase">
                            {regra.fonteTipo === "ia_pdf" ? "🤖 IA" : "✏️ Manual"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {regra.taxaMinimaAm != null && (
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-400 uppercase">Taxa</p>
                          <p className="text-sm font-mono tabular-nums">
                            {regra.taxaMinimaAm}% – {regra.taxaMaximaAm}%
                          </p>
                        </div>
                      )}
                      {salvando === regra.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                      ) : salvoOk === regra.id ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : null}
                      {aberta ? (
                        <ChevronUp className="h-5 w-5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {aberta && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-5 bg-zinc-50/50 dark:bg-zinc-800/20">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <EditField
                          label="Taxa Mínima a.m."
                          value={regra.taxaMinimaAm}
                          type="number"
                          step="0.01"
                          onSave={(v) => salvarCampo(regra.id, "taxaMinimaAm", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Taxa Máxima a.m."
                          value={regra.taxaMaximaAm}
                          type="number"
                          step="0.01"
                          onSave={(v) => salvarCampo(regra.id, "taxaMaximaAm", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Margem Padrão %"
                          value={regra.margemPadraoPct}
                          type="number"
                          step="0.1"
                          onSave={(v) => salvarCampo(regra.id, "margemPadraoPct", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Margem LOAS %"
                          value={regra.margemLoasPct}
                          type="number"
                          step="0.1"
                          onSave={(v) => salvarCampo(regra.id, "margemLoasPct", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Valor Mín Margem Nova"
                          value={regra.margemNovaValorMin}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "margemNovaValorMin", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Valor Máx Margem Nova"
                          value={regra.margemNovaValorMax}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "margemNovaValorMax", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Parcelas Mín Pagas (Refin)"
                          value={regra.refinParcelasMinPagas}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "refinParcelasMinPagas", v ? parseInt(v) : null)}
                        />
                        <EditField
                          label="Troco Mín Liberado"
                          value={regra.trocoMinimoLiberado}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "trocoMinimoLiberado", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Parcelas Mín Pagas (Port)"
                          value={regra.portParcelasMinPagas}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "portParcelasMinPagas", v ? parseInt(v) : null)}
                        />
                        <EditField
                          label="Máx Contratos Única Dig."
                          value={regra.portMaxContratosUnica}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "portMaxContratosUnica", v ? parseInt(v) : null)}
                        />
                        <EditField
                          label="Limite Cartão Mín"
                          value={regra.limiteCartaoMinimo}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "limiteCartaoMinimo", v ? parseFloat(v) : null)}
                        />
                        <EditField
                          label="Limite Cartão Máx"
                          value={regra.limiteCartaoMaximo}
                          type="number"
                          onSave={(v) => salvarCampo(regra.id, "limiteCartaoMaximo", v ? parseFloat(v) : null)}
                        />
                      </div>

                      <div className="mt-4">
                        <EditField
                          label="Observações"
                          value={regra.observacoes}
                          type="text"
                          full
                          onSave={(v) => salvarCampo(regra.id, "observacoes", v || null)}
                        />
                      </div>

                      {regra.importacaoPdf && (
                        <p className="text-[11px] text-zinc-400 mt-4">
                          Extraída de: {regra.importacaoPdf.nomeArquivo} em{" "}
                          {new Date(regra.importacaoPdf.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
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

function EditField({
  label,
  value,
  type,
  step,
  full,
  onSave,
}: {
  label: string;
  value: string | number | null;
  type: "number" | "text";
  step?: string;
  full?: boolean;
  onSave: (val: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(value?.toString() || "");

  function handleBlur() {
    if (temp !== (value?.toString() || "")) {
      onSave(temp);
    }
    setEditando(false);
  }

  return (
    <div className={full ? "col-span-full" : ""}>
      <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium block mb-1">
        {label}
      </label>
      {editando ? (
        <input
          type={type}
          step={step}
          autoFocus
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          className={`rounded-lg border border-violet-300 dark:border-violet-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
            full ? "w-full" : "w-full"
          }`}
        />
      ) : (
        <button
          onClick={() => {
            setTemp(value?.toString() || "");
            setEditando(true);
          }}
          className="w-full text-left rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 transition"
        >
          {value != null && value !== "" ? (
            <span className="font-mono tabular-nums">{value}</span>
          ) : (
            <span className="text-zinc-400 italic">—</span>
          )}
        </button>
      )}
    </div>
  );
}
