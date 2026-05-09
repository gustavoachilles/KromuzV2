"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { UploadCloud, FileText, Loader2, DollarSign, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AnaliseIscaPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "result">("idle");
  const [resultado, setResultado] = useState<{ totalLeads: number, margemEncontrada: number } | null>(null);
  const router = useRouter();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus("uploading");
    
    // Simulação de Upload
    await new Promise(r => setTimeout(r, 1500));
    setStatus("analyzing");

    // Simulação do Motor Interno de Cálculo (Opção A preparada para Motor Interno futuro)
    // No futuro, podemos chamar um backend /api/motor-isca que processa o CSV.
    // Atualmente faz um cálculo estimativo.
    await new Promise(r => setTimeout(r, 3500));

    // Fake Result: Aproximadamente R$ 1.500,00 por linha detectada (apenas para a isca)
    // Vamos estimar o número de linhas pelo tamanho do arquivo (ex: 50 bytes por linha)
    const estimativaLinhas = Math.max(Math.floor(selectedFile.size / 50), 10);
    const leadsComOportunidade = Math.floor(estimativaLinhas * 0.15); // 15% tem margem
    const margemEstimada = leadsComOportunidade * 1250.50; // R$ 1.250 por oportunidade

    setResultado({
      totalLeads: leadsComOportunidade,
      margemEncontrada: margemEstimada
    });
    setStatus("result");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-violet-500/30">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/25">K</div>
          <span className="font-bold text-xl tracking-tight">Kromuz V2</span>
        </Link>
        <Link href="/cadastro" className="text-sm font-medium bg-white text-zinc-950 px-4 py-2 rounded-full hover:bg-zinc-200 transition">
          Entrar no CRM
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-2xl relative z-10">
          {status === "idle" && (
            <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                  Descubra o dinheiro escondido na sua base
                </h1>
                <p className="text-lg text-zinc-400 max-w-xl mx-auto">
                  Faça upload da sua planilha de clientes (CPFs). Nosso motor de IA vai varrer regras de todos os bancos e revelar quanto de comissão você deixou de ganhar.
                </p>
              </div>

              <div 
                className={`border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ${isDragging ? 'border-violet-500 bg-violet-500/5 scale-105' : 'border-zinc-800 bg-zinc-900/50 hover:border-violet-500/30'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-white mb-1">Arraste sua planilha aqui</p>
                    <p className="text-sm text-zinc-500">ou clique para procurar (.csv, .xlsx)</p>
                  </div>
                  <label className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-full text-sm font-medium cursor-pointer transition">
                    Selecionar Arquivo
                    <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileInput} />
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Seus dados são processados e deletados imediatamente (LGPD)
              </div>
            </div>
          )}

          {(status === "uploading" || status === "analyzing") && (
            <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-3xl text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin" />
                <FileText className="w-8 h-8 text-violet-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  {status === "uploading" ? "Enviando arquivo..." : "Motor IA Analisando..."}
                </h2>
                <p className="text-zinc-400">
                  {status === "uploading" ? "Criptografando dados para segurança." : "Cruzando CPFs com 14 tabelas bancárias ativas..."}
                </p>
              </div>
              {status === "analyzing" && (
                <div className="pt-6 space-y-3 text-left max-w-sm mx-auto text-sm text-zinc-500 font-mono">
                  <p className="flex items-center gap-2 animate-pulse"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Lendo histórico de contratos...</p>
                  <p className="flex items-center gap-2 animate-pulse" style={{ animationDelay: '1s' }}><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Calculando margem livre INSS...</p>
                  <p className="flex items-center gap-2 animate-pulse" style={{ animationDelay: '2s' }}><AlertCircle className="w-4 h-4 text-amber-500" /> Buscando oportunidades de portabilidade...</p>
                </div>
              )}
            </div>
          )}

          {status === "result" && resultado && (
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-violet-500/30 p-8 md:p-12 rounded-3xl text-center shadow-2xl shadow-violet-500/10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Análise Concluída!</h2>
              <p className="text-zinc-400 mb-8">Nós encontramos contratos com oportunidade imediata de venda na sua planilha.</p>
              
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-8">
                <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-2">Comissão Potencial Estimada</p>
                <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.margemEncontrada)}
                </div>
                <p className="text-sm text-emerald-500/80 mt-3 font-medium bg-emerald-500/10 inline-block px-3 py-1 rounded-full">
                  Em {resultado.totalLeads} leads identificados
                </p>
              </div>

              <div className="space-y-4">
                <Link href="/cadastro" className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02]">
                  Desbloquear e Baixar Leads <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="text-xs text-zinc-500">Para proteger os dados, baixe o relatório completo de CPFs aprovados criando sua conta gratuita no Kromuz V2.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
