"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ShieldCheck, 
  Calculator, 
  MessageSquare, 
  LayoutDashboard, 
  TrendingUp, 
  Smartphone,
  Bot,
  Zap,
  Lock
} from "lucide-react";
import Link from "next/link";

const MISSOES = [
  {
    id: "m1",
    fase: "Fase 1",
    titulo: "Segurança e Leads",
    descricao: "Crie um lead e valide o mascaramento de dados (LGPD).",
    rota: "/leads",
    requisitos: ["Criar um lead", "Revelar CPF (Auditoria)"]
  },
  {
    id: "m2",
    fase: "Fase 2",
    titulo: "Motor de Cálculo",
    descricao: "Faça uma simulação de consignado usando os coeficientes.",
    rota: "/simulador",
    requisitos: ["Puxar lead criado", "Calcular parcela", "Gerar Contrato"]
  },
  {
    id: "m3",
    fase: "Fase 3",
    titulo: "IA e Atendimento",
    descricao: "Use a Varinha Mágica no Inbox para melhorar sua mensagem.",
    rota: "/inbox",
    requisitos: ["Usar IA Corretora", "Enviar Nota Interna"]
  },
  {
    id: "m4",
    fase: "Fase 4",
    titulo: "Operacional Kanban",
    descricao: "Mova o card na esteira e acione o robô de digitação.",
    rota: "/esteira",
    requisitos: ["Arrastar Card", "Clicar em Digitação Automática"]
  },
  {
    id: "m5",
    fase: "Fase 5",
    titulo: "Gestão e ROI",
    descricao: "Analise o custo de aquisição e o extrato de comissões.",
    rota: "/marketing",
    requisitos: ["Ver Dashboard ROI", "Ver Extrato Sub-corretor"]
  },
];

export default function OnboardingPage() {
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const salvo = localStorage.getItem("kromuz_onboarding");
    if (salvo) {
      const ids = JSON.parse(salvo);
      setConcluidas(ids);
      setProgresso((ids.length / MISSOES.length) * 100);
    }
  }, []);

  const toggleMissao = (id: string) => {
    let novas;
    if (concluidas.includes(id)) {
      novas = concluidas.filter(i => i !== id);
    } else {
      novas = [...concluidas, id];
    }
    setConcluidas(novas);
    localStorage.setItem("kromuz_onboarding", JSON.stringify(novas));
    setProgresso((novas.length / MISSOES.length) * 100);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Kromuz V2 Onboarding</h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Siga as missões para homologar 100% da plataforma online.</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Progresso da Homologação</span>
              <span className="text-sm font-black text-violet-600">{Math.round(progresso)}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-600 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(124,58,237,0.5)]"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        </header>

        {/* Missões */}
        <div className="grid gap-4">
          {MISSOES.map((m, idx) => (
            <div 
              key={m.id}
              className={`group relative bg-white dark:bg-zinc-900 border rounded-2xl p-6 transition-all hover:shadow-md ${
                concluidas.includes(m.id) 
                ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10' 
                : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start gap-6">
                <button 
                  onClick={() => toggleMissao(m.id)}
                  className={`mt-1 transition-colors ${concluidas.includes(m.id) ? 'text-emerald-500' : 'text-zinc-300 hover:text-violet-500'}`}
                >
                  {concluidas.includes(m.id) ? <CheckCircle2 className="w-8 h-8 fill-current bg-white rounded-full" /> : <Circle className="w-8 h-8" />}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded">
                      {m.fase}
                    </span>
                    {concluidas.includes(m.id) && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                        Validado
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{m.titulo}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.descricao}</p>
                  
                  <div className="pt-3 flex flex-wrap gap-2">
                    {m.requisitos.map(req => (
                      <span key={req} className="text-[11px] font-medium text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1">
                        • {req}
                      </span>
                    ))}
                  </div>
                </div>

                <Link 
                  href={m.rota}
                  className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-violet-600 hover:text-white transition-all shadow-sm"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center py-12 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-400">
            Kromuz V2 — Sistema Operacional de Crédito Consignado
          </p>
        </footer>

      </div>
    </div>
  );
}
