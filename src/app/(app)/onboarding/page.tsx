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
  Lock,
  ChevronDown,
  ChevronRight,
  Database,
  Users,
  Building,
  Headset,
  Briefcase,
  Activity,
  Layers,
  Banknote,
  Search
} from "lucide-react";
import Link from "next/link";

// Definição das Categorias e suas respectivas Missões (32 rotas mapeadas)
const CATEGORIAS = [
  {
    id: "cat_config",
    titulo: "Configurações Básicas & Time",
    icone: <Building className="w-5 h-5" />,
    missoes: [
      { id: "m_conf", titulo: "Configurações Globais", descricao: "Verifique os dados da empresa e parâmetros globais.", rota: "/configuracoes", requisitos: ["Salvar nome fantasia", "Verificar fuso horário"] },
      { id: "m_vend", titulo: "Gestão de Vendedores", descricao: "Teste o cadastro e edição de corretores.", rota: "/vendedores", requisitos: ["Criar Vendedor", "Inativar Usuário"] },
      { id: "m_banc", titulo: "Bancos Parceiros", descricao: "Liste e cadastre os bancos que operam crédito.", rota: "/bancos", requisitos: ["Verificar logo do banco", "Ativar banco"] },
      { id: "m_prod", titulo: "Produtos Financeiros", descricao: "Crie modalidades como Consignado ou FGTS.", rota: "/produtos", requisitos: ["Criar produto INSS", "Verificar status"] },
      { id: "m_conv", titulo: "Convênios", descricao: "Vincule órgãos (SIAPE, INSS) aos produtos.", rota: "/convenios", requisitos: ["Cadastrar convênio municipal"] },
      { id: "m_rot", titulo: "Roteiros Operacionais", descricao: "Adicione manuais e scripts para os vendedores.", rota: "/roteiros", requisitos: ["Criar guia de FGTS", "Ler script na visão corretor"] }
    ]
  },
  {
    id: "cat_crm",
    titulo: "CRM, Leads e Importação",
    icone: <Users className="w-5 h-5" />,
    missoes: [
      { id: "m_lead", titulo: "Gestão de Leads", descricao: "Teste o CRUD do Lead e fluxo de status.", rota: "/leads", requisitos: ["Criar Lead Manual", "Alterar Status para Negociação", "Ver Perfil do Lead"] },
      { id: "m_imp", titulo: "Importação de Base", descricao: "Suba uma planilha e distribua leads.", rota: "/importacao", requisitos: ["Fazer upload fictício", "Mapear colunas"] },
      { id: "m_hiscon", titulo: "Importação HISCON", descricao: "Extração inteligente de extratos do INSS.", rota: "/importacao-hiscon", requisitos: ["Fazer upload de PDF", "Verificar margem extraída"] },
      { id: "m_aud", titulo: "Auditoria e LGPD", descricao: "Valide as máscaras de dados sensíveis e os logs.", rota: "/auditoria", requisitos: ["Tentar ver CPF", "Registrar log de visualização"] }
    ]
  },
  {
    id: "cat_ia",
    titulo: "Inteligência & Motor de Crédito",
    icone: <Bot className="w-5 h-5" />,
    missoes: [
      { id: "m_brain", titulo: "Credit Brain", descricao: "Configure a inteligência de crédito global.", rota: "/credit-brain", requisitos: ["Ativar IA", "Testar sugestão de bancos"] },
      { id: "m_reg", titulo: "Motor de Regras", descricao: "Defina faixas etárias e limites de valor.", rota: "/motor-regras", requisitos: ["Bloquear < 18 anos", "Margem mínima"] },
      { id: "m_sim", titulo: "Simulador de Margem", descricao: "Faça uma simulação completa e gere parcelas.", rota: "/simulador", requisitos: ["Calcular INSS", "Verificar coeficiente"] },
      { id: "m_port", titulo: "Mapa de Portabilidade", descricao: "Simule a compra de dívida de outros bancos.", rota: "/mapa-portabilidade", requisitos: ["Informar saldo devedor", "Simular troco"] },
      { id: "m_rag", titulo: "Base de Conhecimento RAG", descricao: "Ensine a IA com arquivos da empresa.", rota: "/conhecimento", requisitos: ["Upload de PDF normativo", "Fazer pergunta pra IA"] }
    ]
  },
  {
    id: "cat_omni",
    titulo: "Atendimento & Omnichannel",
    icone: <MessageSquare className="w-5 h-5" />,
    missoes: [
      { id: "m_inbox", titulo: "Inbox Unificado", descricao: "Converse com leads via WhatsApp Web integrado.", rota: "/inbox", requisitos: ["Enviar mensagem", "Usar IA Corretora"] },
      { id: "m_can", titulo: "Canais de Comunicação", descricao: "Conecte as instâncias da Evolution API.", rota: "/canais", requisitos: ["Cadastrar WhatsApp", "Gerar QR Code"] },
      { id: "m_est", titulo: "Esteira Kanban", descricao: "Arraste propostas entre as colunas do funil.", rota: "/esteira", requisitos: ["Arrastar Card", "Acionar RPA"] },
      { id: "m_sla", titulo: "Monitoramento de SLA", descricao: "Valide as metas de tempo de atendimento.", rota: "/sla", requisitos: ["Verificar lead em atraso", "Disparar alerta"] }
    ]
  },
  {
    id: "cat_fin",
    titulo: "Financeiro & Comissionamento",
    icone: <Banknote className="w-5 h-5" />,
    missoes: [
      { id: "m_com", titulo: "Gestão de Comissões", descricao: "Acompanhe pagamentos de bancos e despesas.", rota: "/comissoes", requisitos: ["Baixar comissão recebida", "Lançar estorno"] },
      { id: "m_split", titulo: "Regras de Split", descricao: "Defina como a comissão é dividida na rede.", rota: "/regras", requisitos: ["Cadastrar regra 60/40", "Simular split"] },
      { id: "m_sub", titulo: "Portal Sub-corretor", descricao: "Acesse a visão limitada de extrato de parceiros.", rota: "/sub-corretor", requisitos: ["Ver espelho", "Solicitar saque"] },
      { id: "m_rec", titulo: "Recuperação de Crédito", descricao: "Renegocie propostas canceladas (Retenção).", rota: "/recuperacao", requisitos: ["Ver motivo do cancelamento", "Tentar reverter"] }
    ]
  },
  {
    id: "cat_dash",
    titulo: "Marketing, Dashboards & Relatórios",
    icone: <Activity className="w-5 h-5" />,
    missoes: [
      { id: "m_d_main", titulo: "Dashboard Principal", descricao: "Visão executiva da operação.", rota: "/dashboard", requisitos: ["Ver VGV total", "Filtro de datas"] },
      { id: "m_d_fin", titulo: "Dashboard Financeiro", descricao: "Análise de DRE e fluxo de caixa.", rota: "/dashboard-financeiro", requisitos: ["Ver lucro líquido", "Análise de custos"] },
      { id: "m_d_vend", titulo: "Dashboard Vendedores", descricao: "Acompanhe as propostas por equipe.", rota: "/dashboard-vendedores", requisitos: ["Ver conversão média"] },
      { id: "m_mkt", titulo: "Marketing & Campanhas", descricao: "Monitore o Custo de Aquisição (CAC).", rota: "/marketing", requisitos: ["Testar cálculo de ROI"] },
      { id: "m_met", titulo: "Gestão de Metas", descricao: "Defina alvos mensais para corretores.", rota: "/metas", requisitos: ["Cadastrar meta 100k", "Ver barra de progresso"] },
      { id: "m_rk", titulo: "Ranking (Gamificação)", descricao: "Painel competitivo entre corretores.", rota: "/ranking", requisitos: ["Ver Top 1", "Animações do podio"] },
      { id: "m_rel", titulo: "Relatórios Avançados", descricao: "Extração de dados para Excel/PDF.", rota: "/relatorios", requisitos: ["Filtrar por banco", "Exportar CSV"] }
    ]
  }
];

export default function OnboardingPage() {
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const [progressoTotal, setProgressoTotal] = useState(0);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({});
  const [busca, setBusca] = useState("");

  const totalMissoes = CATEGORIAS.reduce((acc, cat) => acc + cat.missoes.length, 0);

  useEffect(() => {
    // Expande a primeira categoria por padrão
    setCategoriasExpandidas({ [CATEGORIAS[0].id]: true });

    const salvo = localStorage.getItem("kromuz_qa_onboarding");
    if (salvo) {
      const ids = JSON.parse(salvo);
      setConcluidas(ids);
      setProgressoTotal((ids.length / totalMissoes) * 100);
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
    localStorage.setItem("kromuz_qa_onboarding", JSON.stringify(novas));
    setProgressoTotal((novas.length / totalMissoes) * 100);
  };

  const toggleCategoria = (id: string) => {
    setCategoriasExpandidas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header QA */}
        <header className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
                <ShieldCheck className="w-8 h-8 fill-current text-white/20" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Quality Assurance (QA)</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Mapa completo de testes das 32 rotas do sistema.</p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar módulo..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-brand focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Progress Bar Global */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 block">Progresso Global de Homologação</span>
                <span className="text-xs text-zinc-500">{concluidas.length} de {totalMissoes} módulos testados</span>
              </div>
              <span className="text-2xl font-black text-brand">{Math.round(progressoTotal)}%</span>
            </div>
            <div className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand transition-all duration-700 ease-out shadow-lg shadow-brand/40"
                style={{ width: `${progressoTotal}%` }}
              />
            </div>
          </div>
        </header>

        {/* Categorias e Missões */}
        <div className="space-y-6">
          {CATEGORIAS.map(categoria => {
            // Filtrar missões se houver busca
            const missoesFiltradas = categoria.missoes.filter(m => 
              m.titulo.toLowerCase().includes(busca.toLowerCase()) || 
              m.descricao.toLowerCase().includes(busca.toLowerCase())
            );

            if (busca && missoesFiltradas.length === 0) return null;

            const progressoCat = (categoria.missoes.filter(m => concluidas.includes(m.id)).length / categoria.missoes.length) * 100;
            const isExpandida = buscasExpandidas(busca, categoriasExpandidas[categoria.id]);

            return (
              <div key={categoria.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                
                {/* Cabeçalho da Categoria */}
                <button 
                  onClick={() => toggleCategoria(categoria.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-brand">
                      {categoria.icone}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{categoria.titulo}</h2>
                      <p className="text-sm text-zinc-500">{Math.round(progressoCat)}% homologado ({categoria.missoes.filter(m => concluidas.includes(m.id)).length}/{categoria.missoes.length})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressoCat}%` }} />
                    </div>
                    {isExpandida ? <ChevronDown className="w-5 h-5 text-zinc-400" /> : <ChevronRight className="w-5 h-5 text-zinc-400" />}
                  </div>
                </button>

                {/* Lista de Missões */}
                {isExpandida && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800/50 p-6 pt-2">
                    <div className="grid gap-3 pt-4">
                      {missoesFiltradas.map((m) => (
                        <div 
                          key={m.id}
                          className={`group relative flex flex-col md:flex-row md:items-center gap-4 border rounded-xl p-4 transition-all hover:shadow-md ${
                            concluidas.includes(m.id) 
                            ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10' 
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                          }`}
                        >
                          {/* Checkbox */}
                          <button 
                            onClick={() => toggleMissao(m.id)}
                            className={`flex-shrink-0 transition-colors ${concluidas.includes(m.id) ? 'text-emerald-500' : 'text-zinc-300 hover:text-brand'}`}
                          >
                            {concluidas.includes(m.id) ? <CheckCircle2 className="w-7 h-7 fill-current bg-white dark:bg-zinc-900 rounded-full" /> : <Circle className="w-7 h-7" />}
                          </button>

                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-base font-bold truncate ${concluidas.includes(m.id) ? 'text-zinc-500 dark:text-zinc-400 line-through decoration-emerald-500/30' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                {m.titulo}
                              </h3>
                              {concluidas.includes(m.id) && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                                  Validado
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mb-3">{m.descricao}</p>
                            
                            <div className="flex flex-wrap gap-2">
                              {m.requisitos.map(req => (
                                <span key={req} className="text-[10px] font-medium text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 bg-zinc-50 dark:bg-zinc-800/50">
                                  • {req}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Ação */}
                          <div className="flex items-center justify-end md:justify-start gap-3 mt-4 md:mt-0">
                            <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded hidden md:block">
                              {m.rota}
                            </span>
                            <Link 
                              href={m.rota}
                               className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-brand hover:text-white transition-all shadow-sm flex-shrink-0"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-zinc-400 text-sm">
            <ShieldCheck className="w-4 h-4" />
            Kromuz V2 — Central de Quality Assurance (QA)
          </div>
        </footer>

      </div>
    </div>
  );
}

// Helper para forçar expansão se houver busca
function buscasExpandidas(busca: string, estadoOriginal: boolean) {
  if (busca.length > 0) return true;
  return estadoOriginal;
}
