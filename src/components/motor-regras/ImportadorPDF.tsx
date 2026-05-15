"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles, AlertCircle, Save, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatPct } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Lê um File como base64 usando FileReader (assíncrono, não congela o browser). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // dataURL = "data:application/pdf;base64,XXXXXXX" → queremos só o XXXXXXX
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

type RegraExtraida = {
  tipo_operacao: string;
  tipo_operacao_normalizado: string | null;
  produto_nome_sugerido: string;
  convenio_nome: string;
  versao_roteiro: string | null;
  margem_padrao_pct: number | null;
  margem_loas_pct: number | null;
  taxa_minima_am: number | null;
  taxa_maxima_am: number | null;
  parcelas_min_pagas: number | null;
  troco_minimo_liberado: number | null;
  saldo_devedor_maximo: number | null;
  limite_cartao_minimo: number | null;
  limite_cartao_maximo: number | null;
  fator_rmc: number | null;
  parcela_minima: number | null;
  faixas_etarias: Array<{
    idade_min: number | null;
    idade_max: number | null;
    prazo_max: number | null;
    valor_max: number | null;
  }>;
  especies_aceitas: string[];
  especies_bloqueadas: string[];
  documentos_obrigatorios: string[];
  publico_excluido: string[];
  bancos_pagamento: Array<{ codigo: string; nome: string }>;
  observacoes: string;
  sugestao_produto_id: string | null;
  sugestao_produto_nome: string | null;
  sugestao_produto_aviso: string | null;
  sugestao_convenio_id: string | null;
};

type ResultadoOk = {
  ok: true;
  job_id: string;
  banco_nome_ia: string;
  versao_roteiro: string;
  modelo_usado: string;
  tempo_ms: number;
  sugestao_banco: { id: string; nome: string } | null;
  regras: RegraExtraida[];
};

type ResultadoErro = { ok: false; error: string };

type Resultado = ResultadoOk | ResultadoErro;

type FilaItem = {
  id: string;
  arquivo: File;
  status: "pendente" | "extraindo" | "concluido" | "erro";
  resultado?: Resultado;
  salvando?: boolean;
  salvo?: boolean;
  inicioExtracao?: number;
  tempoFinal?: number;
  passoDebug?: string;
};

const TIPO_LABEL: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova",
  REFINANCIAMENTO: "Refinanciamento",
  PORTABILIDADE: "Portabilidade",
  PORTABILIDADE_REFIN: "Port + Refin",
  CARTAO_CONSIGNADO: "Cartão Consignado",
  CARTAO_BENEFICIO: "Cartão Benefício",
};

const TIPO_COR: Record<string, "primary" | "success" | "warning" | "danger" | "default"> = {
  EMPRESTIMO_CONSIGNADO: "primary",
  REFINANCIAMENTO: "success",
  PORTABILIDADE: "warning",
  PORTABILIDADE_REFIN: "warning",
  CARTAO_CONSIGNADO: "default",
  CARTAO_BENEFICIO: "default",
};

export function ImportadorPDF({ empresaId }: { empresaId: string }) {
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [bancoHint, setBancoHint] = useState("");
  const [, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const canceladoRef = useRef(false);

  const isProcessando = fila.some((i) => i.status === "extraindo");

  useEffect(() => {
    if (!isProcessando) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isProcessando]);

  const updatePasso = (id: string, passo: string) => {
    setFila((prev) => prev.map((item) => (item.id === id ? { ...item, passoDebug: passo } : item)));
  };

  function handleAddFiles(files: FileList | null) {
    if (!files) return;
    const novos: FilaItem[] = Array.from(files).map((arquivo) => ({
      id: crypto.randomUUID(),
      arquivo,
      status: "pendente",
      passoDebug: "Na fila",
    }));
    setFila((prev) => [...prev, ...novos]);
  }

  async function extrairItem(item: FilaItem) {
    const itemId = item.id;
    setFila((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, status: "extraindo", inicioExtracao: Date.now(), passoDebug: "Iniciando" }
          : it
      )
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 300_000);

    try {
      // 1. Upload ao Supabase Storage (bypassa limite de 4.5MB do Vercel)
      updatePasso(itemId, "Enviando arquivo ao storage...");
      const supabase = createSupabaseBrowserClient();
      const safeNome = item.arquivo.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");
      const filePath = `${Date.now()}_${safeNome}`;
      const { error: uploadError } = await supabase.storage
        .from("roteiros")
        .upload(filePath, item.arquivo, { upsert: true });

      if (uploadError) {
        throw new Error(`Falha no upload: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from("roteiros").getPublicUrl(filePath);

      // 2. Enviar URL para a API de extração (payload leve)
      updatePasso(itemId, "Enviando ao motor de IA...");
      const res = await fetch("/api/motor-regras/extrair-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_url: urlData.publicUrl,
          nome_arquivo: item.arquivo.name,
          media_type: item.arquivo.type || "application/pdf",
          banco_hint: bancoHint || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      updatePasso(itemId, "Aguardando resposta do LLM...");

      if (canceladoRef.current) {
        setFila((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? { ...it, status: "erro", resultado: { ok: false, error: "Cancelado pelo usuário." } }
              : it
          )
        );
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      let data: Resultado;
      if (contentType.includes("application/json")) {
        data = (await res.json()) as Resultado;
      } else {
        const text = await res.text();
        data = { ok: false, error: `Erro ${res.status}: ${text.slice(0, 200)}` };
      }

      setFila((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                status: data.ok ? "concluido" : "erro",
                resultado: data,
                tempoFinal: it.inicioExtracao
                  ? Math.round((Date.now() - it.inicioExtracao) / 1000)
                  : undefined,
              }
            : it
        )
      );
    } catch (e) {
      const erroMsg = canceladoRef.current
        ? "Cancelado pelo usuário."
        : (e as Error).name === "AbortError"
          ? "Timeout (5 min)."
          : (e as Error).message;
      setFila((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, status: "erro", resultado: { ok: false, error: erroMsg } }
            : it
        )
      );
    } finally {
      clearTimeout(timeout);
      abortControllerRef.current = null;
    }
  }

  async function iniciarProcessamento() {
    canceladoRef.current = false;
    const pendentes = fila.filter((it) => it.status === "pendente");
    for (const item of pendentes) {
      if (canceladoRef.current) break;
      await extrairItem(item);
    }
  }

  function cancelarProcessamento() {
    canceladoRef.current = true;
    abortControllerRef.current?.abort();
    setFila((prev) =>
      prev.map((it) =>
        it.status === "extraindo"
          ? {
              ...it,
              status: "erro",
              resultado: { ok: false, error: "Cancelado pelo usuário." },
              tempoFinal: it.inicioExtracao
                ? Math.round((Date.now() - it.inicioExtracao) / 1000)
                : 0,
            }
          : it
      )
    );
  }

  function retentarItem(itemId: string) {
    setFila((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, status: "pendente", resultado: undefined } : it
      )
    );
    setTimeout(() => iniciarProcessamento(), 100);
  }

  async function salvarNoBanco(itemId: string) {
    const item = fila.find((it) => it.id === itemId);
    if (!item || item.status !== "concluido" || !item.resultado?.ok) return;

    setFila((prev) => prev.map((it) => (it.id === itemId ? { ...it, salvando: true } : it)));

    try {
      const payload = {
        empresa_id: empresaId,
        banco_id: item.resultado.sugestao_banco?.id,
        banco_nome: item.resultado.sugestao_banco?.nome ?? item.resultado.banco_nome_ia,
        importacao_pdf_id: item.resultado.job_id,
        regras: item.resultado.regras,
      };
      const res = await fetch("/api/motor-regras/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setFila((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, salvo: true, salvando: false } : it))
        );
      } else {
        const erros = (data.erros as Array<{ erro: string }> | undefined) ?? [];
        const msgErro = data.error || erros.map((er) => er.erro).join("; ") || "Falha ao salvar";
        alert("Erro ao salvar: " + msgErro);
        setFila((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, salvando: false } : it))
        );
      }
    } catch (e) {
      alert("Erro ao salvar: " + (e as Error).message);
      setFila((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, salvando: false } : it))
      );
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <CardTitle>Fila de importação de roteiros</CardTitle>
          </div>
          <CardDescription>
            Aceita PDFs e imagens (JPG, PNG, WEBP, HEIC). Selecione os arquivos e clique em Iniciar Extração.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="arquivo">Arquivos (PDF ou imagem)</Label>
              <div
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 px-6 py-10 cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition bg-zinc-50/50 dark:bg-zinc-900/50"
              >
                <Upload className="h-8 w-8 text-zinc-400" />
                <div className="text-center">
                  <p className="text-sm font-medium">Clique ou arraste PDFs/imagens aqui</p>
                  <p className="text-xs text-zinc-500">A fila processa um por vez.</p>
                </div>
                <input
                  ref={inputRef}
                  id="arquivo"
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => handleAddFiles(e.target.files)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banco_hint">Banco (dica geral)</Label>
              <Input
                id="banco_hint"
                placeholder="Ex: BMG, Daycoval"
                value={bancoHint}
                onChange={(e) => setBancoHint(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Se forem bancos variados, deixe em branco — a IA detecta sozinha.
              </p>
            </div>
          </div>

          {fila.length > 0 && (
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium">
                {fila.length} arquivo(s) ·{" "}
                {fila.filter((f) => f.status === "pendente").length} pendentes
              </span>
              <div className="flex items-center gap-2">
                {isProcessando && (
                  <Button variant="destructive" size="sm" onClick={cancelarProcessamento}>
                    Parar
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={
                    isProcessando ||
                    fila.filter((f) => f.status === "pendente").length === 0
                  }
                  onClick={iniciarProcessamento}
                >
                  {isProcessando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Iniciar extração
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-8">
        <AnimatePresence>
          {fila.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="font-medium text-sm">{item.arquivo.name}</p>
                    <p className="text-xs text-zinc-500">
                      {(item.arquivo.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {item.arquivo.type || "auto"}
                    </p>
                  </div>
                </div>
                <div>
                  {item.status === "pendente" && <Badge variant="outline">Pendente</Badge>}
                  {item.status === "extraindo" &&
                    (() => {
                      const elapsed = item.inicioExtracao
                        ? Math.round((Date.now() - item.inicioExtracao) / 1000)
                        : 0;
                      return (
                        <div className="flex items-center gap-2">
                          <Badge variant="primary" className="animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin mr-1 inline" />{" "}
                            Extraindo ({Math.floor(elapsed / 60)}:
                            {(elapsed % 60).toString().padStart(2, "0")})
                          </Badge>
                          {item.passoDebug && (
                            <span className="text-xs text-zinc-500 font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded">
                              {item.passoDebug}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  {item.status === "erro" && <Badge variant="danger">Falhou</Badge>}
                  {item.status === "concluido" && <Badge variant="success">Sucesso</Badge>}
                </div>
              </div>

              {item.status === "erro" && item.resultado?.ok === false && (
                <Card className="border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20">
                  <CardContent className="flex items-start gap-3 p-6">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-700 dark:text-red-300">
                        Falha na extração
                      </p>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80">
                        {item.resultado.error}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isProcessando}
                      onClick={() => retentarItem(item.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar novamente
                    </Button>
                  </CardContent>
                </Card>
              )}

              {item.status === "concluido" && item.resultado?.ok === true && (
                <div className="pl-4 md:pl-8 border-l-2 border-brand/20 dark:border-brand/40 space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                      <span>
                        Banco:{" "}
                        <strong className="text-foreground">
                          {item.resultado.sugestao_banco?.nome || item.resultado.banco_nome_ia}
                        </strong>
                      </span>
                      <span>
                        Modelo:{" "}
                        <strong className="text-foreground font-mono">
                          {item.resultado.modelo_usado}
                        </strong>
                      </span>
                      <span>
                        Tempo:{" "}
                        <strong className="text-foreground">
                          {(item.resultado.tempo_ms / 1000).toFixed(1)}s
                        </strong>
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant={item.salvo ? "outline" : "primary"}
                      disabled={item.salvando || item.salvo}
                      onClick={() => salvarNoBanco(item.id)}
                    >
                      {item.salvando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : item.salvo ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {item.salvando
                        ? "Salvando…"
                        : item.salvo
                          ? "Regras salvas"
                          : "Salvar no banco"}
                    </Button>
                  </div>

                  <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                    {item.resultado.regras.map((r, i) => (
                      <CardRegraExtraida key={i} regra={r} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CardRegraExtraida({ regra }: { regra: RegraExtraida }) {
  const tipo = regra.tipo_operacao_normalizado || regra.tipo_operacao;
  const corBadge = TIPO_COR[tipo] || "default";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-zinc-50/60 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            <CardTitle className="text-base">{TIPO_LABEL[tipo] || tipo}</CardTitle>
          </div>
          <Badge variant={corBadge}>{regra.convenio_nome || "—"}</Badge>
        </div>
        <CardDescription>{regra.produto_nome_sugerido}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {regra.sugestao_produto_aviso && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {regra.sugestao_produto_aviso}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Campo label="Margem padrão" valor={formatPct(regra.margem_padrao_pct)} />
          <Campo label="Margem LOAS" valor={formatPct(regra.margem_loas_pct)} />
          <Campo label="Taxa mín" valor={formatPct(regra.taxa_minima_am)} />
          <Campo label="Taxa máx" valor={formatPct(regra.taxa_maxima_am)} />
          {regra.parcelas_min_pagas !== null && (
            <Campo label="Parcelas mín pagas" valor={`${regra.parcelas_min_pagas}`} />
          )}
          {regra.troco_minimo_liberado !== null && (
            <Campo label="Troco mínimo" valor={formatBRL(regra.troco_minimo_liberado)} />
          )}
          {regra.saldo_devedor_maximo !== null && (
            <Campo label="Saldo dev. máx" valor={formatBRL(regra.saldo_devedor_maximo)} />
          )}
          {regra.limite_cartao_minimo !== null && (
            <Campo label="Limite cartão mín" valor={formatBRL(regra.limite_cartao_minimo)} />
          )}
          {regra.limite_cartao_maximo !== null && (
            <Campo label="Limite cartão máx" valor={formatBRL(regra.limite_cartao_maximo)} />
          )}
          {regra.fator_rmc !== null && <Campo label="Fator RMC" valor={`${regra.fator_rmc}×`} />}
          {regra.parcela_minima !== null && (
            <Campo label="Parcela mín" valor={formatBRL(regra.parcela_minima)} />
          )}
          {regra.versao_roteiro && <Campo label="Versão" valor={regra.versao_roteiro} />}
        </div>

        {regra.faixas_etarias.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">
              Faixas etárias × prazo × valor
            </p>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 text-left">Idade</th>
                    <th className="px-3 py-2 text-left">Prazo máx</th>
                    <th className="px-3 py-2 text-left">Valor máx</th>
                  </tr>
                </thead>
                <tbody>
                  {regra.faixas_etarias.map((f, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2 font-mono">
                        {f.idade_min ?? "?"} – {f.idade_max ?? "?"}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {f.prazo_max !== null ? `${f.prazo_max}m` : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono">{formatBRL(f.valor_max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(regra.especies_aceitas.length > 0 || regra.especies_bloqueadas.length > 0) && (
          <div className="space-y-2">
            {regra.especies_aceitas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-zinc-500 mr-1">Espécies aceitas:</span>
                {regra.especies_aceitas.map((e) => (
                  <Badge key={e} variant="success">
                    {e}
                  </Badge>
                ))}
              </div>
            )}
            {regra.especies_bloqueadas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-zinc-500 mr-1">Bloqueadas:</span>
                {regra.especies_bloqueadas.map((e) => (
                  <Badge key={e} variant="danger">
                    {e}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {regra.publico_excluido.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500 mb-1">
              Público excluído
            </p>
            <ul className="text-xs text-zinc-700 dark:text-zinc-300 list-disc list-inside space-y-0.5">
              {regra.publico_excluido.slice(0, 6).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="font-mono font-medium">{valor}</span>
    </div>
  );
}
