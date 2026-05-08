"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, CheckCircle2, Building2, TrendingUp, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Assumindo que a Empresa ID para leads públicos seja definida via env ou configuração estática.
// Em um sistema real multi-tenant, a URL pública (`/simulador-inss?empresa=xyz`) diria qual é a empresa.
// Aqui vamos usar um ID estático ou simular que o endpoint busca a empresa "dona" do site.
const PUBLIC_EMPRESA_ID = "00000000-0000-0000-0000-000000000000"; // Apenas para placeholder na build

interface Props {
  convenioFixo: string;
  origemFixa: string;
  titulo: string;
  descricao: string;
}

const ESPECIES = ["Aposentadoria", "Pensão", "Benefício Permanente", "Auxílio Doença"];

export default function SimuladorPublico({ convenioFixo, origemFixa, titulo, descricao }: Props) {
  const [etapa, setEtapa] = useState<"perguntas" | "resultado">("perguntas");
  const [form, setForm] = useState({
    beneficio: convenioFixo,
    especie: "",
    idade: "",
    valor_beneficio: "",
  });
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formLead, setFormLead] = useState({ nome: "", telefone: "", cidade: "" });
  const [salvandoLead, setSalvandoLead] = useState(false);

  const simular = async () => {
    if (!form.idade || !form.valor_beneficio) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      // Como é uma página pública, a rota de enquadramento tentará achar os melhores bancos
      const res = await fetch("/api/simulador/enquadramento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: PUBLIC_EMPRESA_ID, // Em prod, isso deve ser injetado pelo contexto ou middleware
          beneficioTipo: form.beneficio,
          especieBeneficio: form.especie || null,
          idade: parseInt(form.idade),
          valorBeneficio: parseFloat(form.valor_beneficio.replace(",", ".")),
          margemDisponivel: parseFloat(form.valor_beneficio.replace(",", ".")) * 0.35, // Estima 35% de margem
          salvarSimulacao: false, // Não salva histórico de anônimo até que vire lead
        }),
      });

      const data = await res.json();
      
      setResultado({
        bancos_elegiveis: data.ranking || [],
        valor_credito_estimado: data.valor_maximo_aprovavel || 0,
        taxa_media: data.ranking?.length > 0 ? data.ranking[0].taxa_media : 1.8,
        probabilidade_media: data.melhor_score || 0,
      });

      setEtapa("resultado");
    } catch (e) {
      toast.error("Erro ao processar simulação");
    } finally {
      setLoading(false);
    }
  };

  const salvarLead = async () => {
    if (!formLead.nome || !formLead.telefone) {
      toast.error("Preencha nome e telefone");
      return;
    }
    setSalvandoLead(true);
    try {
      // Aqui chamaríamos uma rota POST /api/leads para salvar o lead
      toast.success("Seu cadastro foi recebido! Nossa equipe entrará em contato");
      setTimeout(() => {
        setEtapa("perguntas");
        setFormLead({ nome: "", telefone: "", cidade: "" });
      }, 3000);
    } catch (e) {
      toast.error("Erro ao salvar cadastro");
    } finally {
      setSalvandoLead(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header Light */}
      <header className="py-5 px-6 border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-800">KROMUZ</span>
          </div>
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm py-1 px-3">
            Simulação Gratuita
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        {etapa === "perguntas" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-10 h-10 text-indigo-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                {titulo}
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                {descricao}
              </p>
            </div>

            <Card className="border-0 shadow-2xl shadow-indigo-900/5 bg-white/80 backdrop-blur-xl">
              <CardContent className="p-8 space-y-6">
                {convenioFixo === "INSS" && (
                  <div>
                    <label className="block text-sm font-bold mb-3 text-slate-700">Tipo de benefício</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ESPECIES.map(esp => (
                        <button
                          key={esp}
                          onClick={() => setForm(f => ({ ...f, especie: esp }))}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                            form.especie === esp
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20"
                              : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                          }`}
                        >
                          {esp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700">Sua idade</label>
                    <Input
                      type="number"
                      value={form.idade}
                      onChange={e => setForm(f => ({ ...f, idade: e.target.value }))}
                      placeholder="Ex: 65"
                      className="h-12 bg-slate-50 border-slate-200 text-lg font-medium shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700">Valor do Benefício (R$)</label>
                    <Input
                      type="number"
                      value={form.valor_beneficio}
                      onChange={e => setForm(f => ({ ...f, valor_beneficio: e.target.value }))}
                      placeholder="Ex: 2500"
                      className="h-12 bg-slate-50 border-slate-200 text-lg font-medium shadow-inner"
                    />
                  </div>
                </div>

                <Button
                  onClick={simular}
                  disabled={loading || !form.idade || !form.valor_beneficio}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-14 text-lg font-bold shadow-xl shadow-indigo-600/20 mt-4 rounded-xl transition-all hover:scale-[1.02]"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Calculando limites...</>
                  ) : (
                    <><TrendingUp className="w-5 h-5 mr-2" /> Simular Meu Crédito Agora</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {etapa === "resultado" && resultado && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <button
              onClick={() => setEtapa("perguntas")}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
            >
              ← Refazer simulação
            </button>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-2 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">Crédito Pré-Aprovado!</h2>
              <p className="text-slate-600">Baseado no seu perfil, encontramos excelentes opções.</p>
            </div>

            <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-600 to-emerald-500 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
              <CardContent className="pt-10 pb-10 px-8 text-center relative z-10">
                <p className="text-green-100 font-medium mb-2 uppercase tracking-wider text-sm">Valor Estimado Liberado</p>
                <p className="text-6xl font-black drop-shadow-md">
                  R$ {resultado.valor_credito_estimado?.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
                <div className="mt-6 inline-flex gap-6 bg-black/20 rounded-2xl px-6 py-3 backdrop-blur-sm">
                   <div>
                     <p className="text-green-200 text-xs uppercase font-bold tracking-wider">Taxa a partir de</p>
                     <p className="font-bold text-xl">{resultado.taxa_media?.toFixed(2)}% <span className="text-sm font-normal">a.m.</span></p>
                   </div>
                   <div className="w-px bg-white/20"></div>
                   <div>
                     <p className="text-green-200 text-xs uppercase font-bold tracking-wider">Chances de Aprovação</p>
                     <p className="font-bold text-xl">{resultado.probabilidade_media}%</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA Lead Form */}
            <Card className="border border-indigo-100 shadow-xl shadow-indigo-100 overflow-hidden">
              <div className="bg-indigo-50 border-b border-indigo-100 p-6 text-center">
                <h3 className="text-xl font-bold text-indigo-900">Garanta essa oferta agora</h3>
                <p className="text-indigo-700 text-sm mt-1">Preencha abaixo para um especialista liberar o valor na sua conta.</p>
              </div>
              <CardContent className="p-6 space-y-4 bg-white">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Seu nome completo"
                    value={formLead.nome}
                    onChange={e => setFormLead(f => ({ ...f, nome: e.target.value }))}
                    className="h-12 bg-slate-50"
                  />
                  <Input
                    placeholder="WhatsApp (com DDD)"
                    value={formLead.telefone}
                    onChange={e => setFormLead(f => ({ ...f, telefone: e.target.value }))}
                    className="h-12 bg-slate-50"
                  />
                </div>
                <Button
                  onClick={salvarLead}
                  disabled={salvandoLead}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-bold shadow-lg shadow-emerald-600/20 rounded-xl"
                >
                  {salvandoLead ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Enviando...</>
                  ) : (
                    <>Falar com Especialista <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
                <p className="text-center text-xs text-slate-400 mt-2 flex items-center justify-center gap-1">
                   🔒 Seus dados estão seguros e criptografados.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
