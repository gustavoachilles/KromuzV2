"use client";

import { useState } from "react";
import { UploadCloud, FileType, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface UploadHisconProps {
  onProcessamentoCompleto: (dados: any) => void;
  empresaId: string;
}

export function UploadHiscon({ onProcessamentoCompleto, empresaId }: UploadHisconProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idadeInput, setIdadeInput] = useState<string>("");

  const handleFile = async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Por favor, envie apenas arquivos PDF.");
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          
          const response = await fetch("/api/simulador/extrair", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              pdfBase64: base64, 
              empresaId,
              idadeManual: idadeInput ? Number(idadeInput) : undefined 
            }),
          });

          // Trata Timeout (504) ou erros do servidor que retornam HTML em vez de JSON
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            if (response.status === 504) {
              throw new Error("O servidor demorou muito para responder (Timeout). O PDF pode ser muito grande ou a IA está congestionada.");
            }
            throw new Error(`Erro inesperado do servidor (Status ${response.status}).`);
          }

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Erro ao processar o extrato.");
          }

          onProcessamentoCompleto(data);
          setLoading(false);
        } catch (err: any) {
          console.error("Erro no processamento do HISCON:", err);
          setError(err.message || "Falha ao ler o PDF. Tente novamente.");
          setLoading(false);
          setFile(null);
        }
      };

      reader.onerror = () => {
        setError("Erro ao ler o arquivo no navegador.");
        setLoading(false);
      };
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro inesperado.");
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
      
      {/* Aviso e Input de Idade */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="text-sm text-indigo-900">
          <p className="font-semibold mb-1">Idade do Cliente (Opcional)</p>
          <p className="opacity-80">Como o HISCON não traz a idade, se você não preencher, o motor calculará com o padrão de <strong>60 anos</strong>.</p>
        </div>
        <div className="w-full sm:w-32">
          <input 
            type="number" 
            placeholder="Ex: 65" 
            value={idadeInput}
            onChange={(e) => setIdadeInput(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-indigo-900 placeholder:text-indigo-300 font-medium text-center"
          />
        </div>
      </div>

      <div 
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ${
          isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
        } ${loading ? "opacity-75 pointer-events-none" : "cursor-pointer"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <input 
          type="file" 
          accept=".pdf" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          disabled={loading}
        />
        
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          {loading ? (
            <>
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-lg font-semibold text-slate-700">A Inteligência Artificial está lendo o extrato...</p>
              <p className="text-sm text-slate-500 mt-2">Cruzando dados do cliente com as regras dos bancos.</p>
            </>
          ) : error ? (
            <>
              <XCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-lg font-semibold text-red-600">Falha no Processamento</p>
              <p className="text-sm text-slate-600 mt-2">{error}</p>
              <p className="text-sm text-indigo-600 font-medium mt-4">Clique ou arraste outro arquivo para tentar novamente</p>
            </>
          ) : (
            <>
              <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragging ? "text-indigo-600" : "text-slate-400"}`} />
              <p className="text-lg font-semibold text-slate-700">
                Arraste o Extrato do INSS (HISCON) para cá
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Ou clique para selecionar o PDF do seu computador
              </p>
              <div className="mt-6 flex items-center text-xs text-slate-400 bg-white px-3 py-1 rounded-full border shadow-sm">
                <FileType className="w-4 h-4 mr-2" /> PDF seguro (não fica salvo no banco de dados)
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
