"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

export function ImportacaoHisconClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<any | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    setResultado(null);
    setErro(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        setImportando(true);
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        
        // Convert array buffer to base64
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const res = await fetch("/api/simulador/extrair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: base64 }),
        });

        const data = await res.json();
        setImportando(false);

        if (!res.ok) { setErro(data.error); return; }
        setResultado(data);
      } catch (err: any) {
        setErro("Falha ao processar o arquivo PDF.");
        setImportando(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <Upload className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Extrator com IA</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Análise de Extrato (HISCON)</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Faça upload de um arquivo PDF de Extrato de Empréstimos para analisar contratos ativos e margens.
          </p>
        </header>

        {/* Upload Area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition"
        >
          {importando ? (
            <Loader2 className="h-12 w-12 text-violet-500 mx-auto mb-4 animate-spin" />
          ) : (
            <FileText className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          )}
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {importando ? "Analisando PDF..." : "Clique para selecionar um PDF do HISCON"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Apenas formato .pdf</p>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
        </div>

        {/* Erro */}
        {erro && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-5 py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{erro}</p>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Extração Concluída</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Encontramos <strong className="text-zinc-900 dark:text-zinc-100">{resultado.contratosAtivos?.length || 0}</strong> contratos ativos no extrato de <strong className="text-zinc-900 dark:text-zinc-100">{resultado.cliente?.especieNome || "INSS"}</strong>.
                </p>
              </div>
            </div>

            {/* Margens */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500">Margem Livre</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600">R$ {resultado.cliente?.margemLivre?.toFixed(2) || "0.00"}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500">Margem RMC</p>
                <p className="text-2xl font-bold tabular-nums text-violet-600">R$ {resultado.cliente?.margemRmc?.toFixed(2) || "0.00"}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500">Margem RCC</p>
                <p className="text-2xl font-bold tabular-nums text-sky-600">R$ {resultado.cliente?.margemRcc?.toFixed(2) || "0.00"}</p>
              </div>
            </div>

            {/* Contratos */}
            {resultado.contratosAtivos?.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-md font-semibold">Contratos Ativos</h3>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {resultado.contratosAtivos.map((c: any, i: number) => (
                    <div key={i} className="px-6 py-4 grid grid-cols-4 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                      <div className="col-span-2">
                        <p className="text-sm font-semibold">{c.bancoNome}</p>
                        <p className="text-xs text-zinc-500">{c.parcelasPagas} de {c.parcelasTotal} pagas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Parcela</p>
                        <p className="text-sm font-bold tabular-nums">R$ {c.valorParcela?.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Taxa Juros</p>
                        <p className="text-sm font-bold tabular-nums text-amber-600">{c.taxaJuros}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => router.push("/credit-brain")} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition">
                Simular Portabilidade no Credit Brain
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
