"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download, X } from "lucide-react";

type LeadRow = {
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  uf?: string;
  cidade?: string;
  numeroBeneficio?: string;
  margemLivre?: number;
};

function parseCSV(text: string): LeadRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(/[;,\t]/).map((h) => h.trim().toLowerCase().replace(/["\s]/g, ""));
  const rows: LeadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 1) continue;

    const obj: Record<string, string> = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] || ""; });

    const nome = obj["nome"] || obj["name"] || obj["cliente"] || obj["nomeCompleto"] || obj["nomecompleto"] || "";
    if (!nome) continue;

    rows.push({
      nome,
      cpf: obj["cpf"] || obj["documento"] || undefined,
      telefone: obj["telefone"] || obj["celular"] || obj["whatsapp"] || obj["fone"] || undefined,
      email: obj["email"] || obj["e-mail"] || undefined,
      uf: obj["uf"] || obj["estado"] || undefined,
      cidade: obj["cidade"] || obj["municipio"] || undefined,
      numeroBeneficio: obj["beneficio"] || obj["nb"] || obj["numerobeneficio"] || undefined,
      margemLivre: obj["margem"] || obj["margemlivre"] ? Number(obj["margem"] || obj["margemlivre"]) : undefined,
    });
  }

  return rows;
}

export function ImportacaoClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dados, setDados] = useState<LeadRow[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ importados: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    setResultado(null);
    setErro(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setDados(parsed);
    };
    reader.readAsText(file, "UTF-8");
  }

  async function importar() {
    if (dados.length === 0) return;
    setImportando(true);
    setErro(null);

    const res = await fetch("/api/importacao-clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: dados }),
    });

    const data = await res.json();
    setImportando(false);

    if (!res.ok) { setErro(data.error); return; }
    setResultado(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-brand mb-1">
            <Upload className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Importação</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Importar Clientes</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Faça upload de um arquivo CSV para importar leads em massa
          </p>
        </header>

        {/* Upload */}
        <div
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center cursor-pointer hover:border-brand hover:bg-brand/5 transition"
        >
          <FileSpreadsheet className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Clique para selecionar um arquivo CSV
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Colunas aceitas: nome, cpf, telefone, email, uf, cidade, beneficio, margem
          </p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>

        {/* Preview */}
        {dados.length > 0 && !resultado && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Preview</h2>
                <p className="text-xs text-zinc-500">
                  {nomeArquivo} · {dados.length} registro{dados.length !== 1 ? "s" : ""} encontrado{dados.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button onClick={() => { setDados([]); setNomeArquivo(""); }}
                className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/40 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-zinc-500">#</th>
                    <th className="text-left px-4 py-2 text-zinc-500">Nome</th>
                    <th className="text-left px-4 py-2 text-zinc-500">CPF</th>
                    <th className="text-left px-4 py-2 text-zinc-500">Telefone</th>
                    <th className="text-left px-4 py-2 text-zinc-500">UF</th>
                    <th className="text-right px-4 py-2 text-zinc-500">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {dados.slice(0, 50).map((d, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{d.nome}</td>
                      <td className="px-4 py-2 tabular-nums">{d.cpf || "—"}</td>
                      <td className="px-4 py-2">{d.telefone || "—"}</td>
                      <td className="px-4 py-2">{d.uf || "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{d.margemLivre ? `R$ ${d.margemLivre}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dados.length > 50 && (
                <p className="text-center text-xs text-zinc-400 py-2">... e mais {dados.length - 50} registros</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
              <button onClick={() => { setDados([]); setNomeArquivo(""); }}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
              <button onClick={importar} disabled={importando}
                className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition">
                {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importando ? "Importando..." : `Importar ${dados.length} Leads`}
              </button>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-5 py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{erro}</p>
          </div>
        )}

        {/* Sucesso */}
        {resultado && (
          <div className="rounded-xl bg-brand/10 border border-brand/20 px-5 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-brand mx-auto mb-3" />
            <h3 className="text-lg font-bold text-brand">
              {resultado.importados} lead{resultado.importados !== 1 ? "s" : ""} importado{resultado.importados !== 1 ? "s" : ""}!
            </h3>
            <p className="text-sm text-brand/80 mt-1">Os leads foram adicionados com status &quot;Novo&quot;.</p>
            <button onClick={() => router.push("/leads")}
              className="mt-4 px-5 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 transition">
              Ver Leads →
            </button>
          </div>
        )}

        {/* Template */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-zinc-400" /> Modelo de CSV
          </h3>
          <pre className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg overflow-x-auto">
{`nome;cpf;telefone;email;uf;cidade;beneficio;margem
João da Silva;123.456.789-00;(11) 99999-0000;joao@email.com;SP;São Paulo;1234567890;350.00
Maria Souza;987.654.321-00;(21) 98888-0000;maria@email.com;RJ;Rio de Janeiro;9876543210;480.50`}
          </pre>
        </div>
      </div>
    </div>
  );
}
