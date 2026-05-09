"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileSpreadsheet, Loader2, Target, DollarSign, Users, ChevronRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type AnaliseResult = {
  resumo: {
    totalLeads: number;
    leadsComOportunidade: number;
    volumeTotalDisponivel: number;
  };
  leads: any[];
};

export function ImportarLeadsClient({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isAnalisando, setIsAnalisando] = useState(false);
  const [isImportando, setIsImportando] = useState(false);
  const [analise, setAnalise] = useState<AnaliseResult | null>(null);

  // Função simples para dar parse no CSV via client-side
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 2) throw new Error("O arquivo precisa ter cabeçalho e pelo menos 1 lead.");
    
    // Identificar separador (, ou ;)
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    
    const headers = headerLine.split(separator).map(h => h.trim().toLowerCase());
    
    const idxNome = headers.findIndex(h => h.includes("nome"));
    const idxCpf = headers.findIndex(h => h.includes("cpf"));
    const idxTel = headers.findIndex(h => h.includes("tel") || h.includes("cel"));
    const idxMargem = headers.findIndex(h => h.includes("margem"));
    const idxIdade = headers.findIndex(h => h.includes("idade"));

    if (idxNome === -1) throw new Error("A coluna 'Nome' é obrigatória.");

    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim());
      if (cols.length < headers.length) continue;

      let margem = 0;
      if (idxMargem !== -1 && cols[idxMargem]) {
        // Limpar R$ e formatar string para número (br format)
        let m = cols[idxMargem].replace(/[R$\s]/g, '');
        if (m.includes(',') && m.includes('.')) m = m.replace('.', '').replace(',', '.');
        else if (m.includes(',')) m = m.replace(',', '.');
        margem = parseFloat(m) || 0;
      }

      results.push({
        nome: cols[idxNome],
        cpf: idxCpf !== -1 ? cols[idxCpf] : undefined,
        telefone: idxTel !== -1 ? cols[idxTel] : undefined,
        idade: idxIdade !== -1 ? parseInt(cols[idxIdade]) : undefined,
        margemLivre: margem > 0 ? margem : undefined
      });
    }

    return results;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith(".csv")) {
      toast.error("Por favor, envie um arquivo .csv");
      return;
    }
    setFile(selected);
    processFile(selected);
  };

  const processFile = async (fileObj: File) => {
    setIsAnalisando(true);
    try {
      const text = await fileObj.text();
      const rawLeads = parseCSV(text);

      if (rawLeads.length === 0) throw new Error("Nenhum dado válido encontrado.");

      const res = await fetch("/api/leads/analisar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawLeads)
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnalise(data);
      toast.success("Análise concluída com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao analisar o arquivo");
      setFile(null);
    } finally {
      setIsAnalisando(false);
    }
  };

  const handleImportar = async () => {
    if (!analise) return;
    setIsImportando(true);
    
    try {
      // Mapear os leads finais com o valor liberado simulado
      const leadsFinal = analise.leads.map(l => ({
        nome: l.nome,
        cpf: l.cpf,
        telefone: l.telefone,
        margemLivre: l.margemLivre,
        valorLiberado: l.oportunidade ? l.oportunidade.valorLiberado : undefined,
        bancoPreferido: l.oportunidade ? l.oportunidade.bancoNome : undefined
      }));

      const res = await fetch("/api/leads/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadsFinal)
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success("Leads importados com sucesso!");
      router.push("/pipeline");
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar leads");
    } finally {
      setIsImportando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl mb-4">
            <UploadCloud className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Raio-X de Base (Importação)</h1>
          <p className="text-zinc-500 max-w-lg mx-auto">
            Faça upload da sua planilha de clientes. O sistema varre todos os CPFs e margens para calcular o dinheiro que está parado na mesa antes de importar.
          </p>
        </header>

        {!analise && !isAnalisando && (
          <div className="mt-8 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <FileSpreadsheet className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Envie seu arquivo CSV</h3>
            <p className="text-sm text-zinc-500 mb-6">Colunas necessárias: Nome, CPF, Telefone, Margem</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition"
            >
              Selecionar Arquivo
            </button>
          </div>
        )}

        {isAnalisando && (
          <div className="mt-8 text-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-violet-600" />
            <h3 className="text-xl font-bold">Analisando milhares de margens...</h3>
            <p className="text-zinc-500 text-sm">Cruzando dados com suas Tabelas de Coeficiente e encontrando oportunidades.</p>
          </div>
        )}

        {analise && !isAnalisando && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 mt-8 space-y-8">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <DollarSign className="w-48 h-48" />
              </div>
              <h2 className="text-2xl font-bold mb-2 relative z-10">Resultado do Raio-X</h2>
              <p className="text-indigo-100 mb-8 relative z-10">Encontramos o seguinte potencial adormecido na sua base:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <Users className="w-6 h-6 text-indigo-200 mx-auto mb-3" />
                  <p className="text-4xl font-black mb-1">{analise.resumo.totalLeads}</p>
                  <p className="text-xs uppercase tracking-widest text-indigo-200 font-semibold">Leads Lidos</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <Target className="w-6 h-6 text-emerald-300 mx-auto mb-3" />
                  <p className="text-4xl font-black text-emerald-300 mb-1">{analise.resumo.leadsComOportunidade}</p>
                  <p className="text-xs uppercase tracking-widest text-indigo-200 font-semibold">Com Oportunidade</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-emerald-400/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
                  <DollarSign className="w-6 h-6 text-emerald-300 mx-auto mb-3 relative z-10" />
                  <p className="text-3xl font-black text-emerald-300 mb-1 relative z-10">
                    R$ {analise.resumo.volumeTotalDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs uppercase tracking-widest text-indigo-200 font-semibold relative z-10">Volume na Mesa</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setAnalise(null)}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 transition"
              >
                Cancelar e Voltar
              </button>
              <button 
                onClick={handleImportar}
                disabled={isImportando}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 transition shadow-lg"
              >
                {isImportando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {isImportando ? "Importando..." : "Importar Base e Iniciar Vendas"}
                {!isImportando && <ChevronRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
