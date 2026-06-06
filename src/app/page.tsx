import Link from "next/link";
import { 
  ArrowRight, 
  Brain, 
  BarChart3, 
  MessageSquare, 
  Calculator, 
  ShieldCheck, 
  Rocket, 
  CheckCircle2, 
  FileText,
  X,
  Crown,
  Zap,
  Star,
  Users,
  Database,
  Kanban,
  DollarSign,
  Building2,
  KeyRound,
  Globe,
  Target,
  Trophy,
  Upload,
  Clock,
  Shield,
  Inbox,
  Repeat,
  Megaphone,
  BookOpen,
  LayoutDashboard,
  Receipt,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── Planos hardcoded ──
const PLANOS = [
  {
    slug: "start",
    nome: "Start",
    subtitulo: "O Essencial para Vender",
    preco: 69.90,
    cor: "#22c55e",
    corGlow: "rgba(34,197,94,0.15)",
    destaque: false,
    usuarios: "5",
    leads: "1.000",
    armazenamento: "5 GB",
    features: [
      { texto: "CRM e Gestão de Leads", incluso: true },
      { texto: "Simulador HISCON com IA", incluso: true },
      { texto: "Motor de Regras Automático", incluso: true },
      { texto: "Esteira (Kanban) Customizável", incluso: true },
      { texto: "Comissões", incluso: true },
      { texto: "Convênios e Tabelas", incluso: true },
      { texto: "Credenciais Bancárias", incluso: true },
      { texto: "Gov.br Extrator", incluso: true },
      { texto: "App Mobile (PWA)", incluso: true },
      { texto: "Relatórios Avançados", incluso: false },
      { texto: "Ranking e Metas", incluso: false },
      { texto: "RH Completo", incluso: false },
    ],
  },
  {
    slug: "pro",
    nome: "Pro",
    subtitulo: "Inteligência que Escala",
    preco: 149.90,
    cor: "#3b82f6",
    corGlow: "rgba(59,130,246,0.20)",
    destaque: true,
    usuarios: "10",
    leads: "10.000",
    armazenamento: "20 GB",
    features: [
      { texto: "Tudo do Start", incluso: true, bold: true },
      { texto: "Mapa de Portabilidade", incluso: true },
      { texto: "Relatórios de Produção", incluso: true },
      { texto: "Ranking de Vendedores", incluso: true },
      { texto: "Metas Individuais e Equipe", incluso: true },
      { texto: "Calendário e Follow-ups", incluso: true },
      { texto: "Roteiros de Venda", incluso: true },
      { texto: "Recuperação de Clientes", incluso: true },
      { texto: "Importação em Massa", incluso: true },
      { texto: "Auditoria e SLA", incluso: true },
      { texto: "Dashboard Financeiro", incluso: true },
      { texto: "RH Completo", incluso: false },
    ],
  },
  {
    slug: "black",
    nome: "Black",
    subtitulo: "O Arsenal Completo",
    preco: 349.90,
    cor: "#a855f7",
    corGlow: "rgba(168,85,247,0.15)",
    destaque: false,
    usuarios: "Ilimitados",
    leads: "Ilimitados",
    armazenamento: "100 GB",
    features: [
      { texto: "Tudo do Pro", incluso: true, bold: true },
      { texto: "IA Avançada + Insights", incluso: true },
      { texto: "Inbox Integrado", incluso: true },
      { texto: "Automações de Follow-up", incluso: true },
      { texto: "RH Completo (Folha, Ponto, Férias)", incluso: true },
      { texto: "Dashboard Financeiro", incluso: true },
      { texto: "Módulo Contábil e Fiscal", incluso: true },
      { texto: "Base de Conhecimento", incluso: true },
      { texto: "Marketing e Campanhas", incluso: true },
      { texto: "Mesa de Operações", incluso: true },
      { texto: "Suporte Prioritário", incluso: true },
      { texto: "Usuários Ilimitados", incluso: true },
    ],
  },
];

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-violet-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/25">
              K
            </div>
            <span className="font-bold text-xl tracking-tight">Kromuz</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#planos" className="text-sm font-medium text-zinc-400 hover:text-white transition hidden sm:block">Planos</a>
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition">Login</Link>
            <Link href="/cadastro" className="text-sm font-medium bg-white text-zinc-950 px-4 py-2 rounded-full hover:bg-zinc-200 transition">
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-400">
              <Rocket className="w-4 h-4" /> A nova era para Corbans e Promotoras
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight">
              A inteligência que <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">multiplica</span> suas comissões.
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Descubra quanto dinheiro está dormindo na sua base de clientes. CRM, Motor de Regras e Simulador HISCON em um único sistema.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/cadastro" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 text-white font-bold text-lg shadow-xl shadow-violet-500/30 hover:opacity-90 hover:scale-105 transition-all">
                Começar Grátis por 7 dias <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#planos" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-8 py-4 text-white font-bold text-lg hover:bg-zinc-800 transition">
                Ver Planos
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-zinc-900/50 border-y border-zinc-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Tudo que o seu Corban precisa</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">Substitua até 4 ferramentas diferentes por uma plataforma única desenhada para alta performance em crédito consignado.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<Brain />}
                title="Motor de Regras com IA"
                desc="A Inteligência Artificial cruza dados do cliente com as regras de todos os bancos e diz exatamente qual aprova."
              />
              <FeatureCard 
                icon={<Calculator />}
                title="Simulador HISCON"
                desc="Upload do extrato INSS → extrai contratos, margens, renda e dados bancários automaticamente em segundos."
              />
              <FeatureCard 
                icon={<Kanban />}
                title="Esteira de Vendas"
                desc="Pipeline visual com etapas customizáveis. Acompanhe cada contrato da prospecção até a formalização."
              />
              <FeatureCard 
                icon={<DollarSign />}
                title="Gestão de Comissões"
                desc="Controle total sobre repasses, tabelas de comissão e sincronização com bancos parceiros."
              />
              <FeatureCard 
                icon={<Globe />}
                title="Gov.br Extrator"
                desc="Extraia dados do beneficiário diretamente do Gov.br, com preenchimento automático no cadastro."
              />
              <FeatureCard 
                icon={<ShieldCheck />}
                title="Segurança Multi-Tenant"
                desc="Cada empresa tem dados 100% isolados. Criptografia, auditoria e controle total de acessos."
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="planos" className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-400 mb-6">
                <Sparkles className="w-4 h-4" /> Preços para todos os tamanhos
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Escolha o plano ideal</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">Comece com 7 dias grátis. Cancele quando quiser. Sem multa, sem burocracia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
              {PLANOS.map((plano) => (
                <div 
                  key={plano.slug} 
                  className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 hover:scale-[1.02] ${
                    plano.destaque 
                      ? "bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 border-2 border-blue-500/40 shadow-2xl shadow-blue-500/10 md:-mt-4 md:mb-[-16px]" 
                      : "bg-zinc-900/60 border border-zinc-800/80"
                  }`}
                  style={{ backdropFilter: "blur(20px)" }}
                >
                  {plano.destaque && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-1.5">
                        <Star className="w-3 h-3" /> MAIS POPULAR
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: `${plano.cor}20`, border: `1px solid ${plano.cor}40` }}
                      >
                        {plano.slug === "start" ? <Zap className="w-5 h-5" style={{ color: plano.cor }} /> 
                         : plano.slug === "pro" ? <Star className="w-5 h-5" style={{ color: plano.cor }} /> 
                         : <Crown className="w-5 h-5" style={{ color: plano.cor }} />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{plano.nome}</h3>
                        <p className="text-xs text-zinc-500">{plano.subtitulo}</p>
                      </div>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-sm text-zinc-500 mb-2">R$</span>
                      <span className="text-5xl font-black text-white tracking-tight">
                        {Math.floor(plano.preco)}
                      </span>
                      <span className="text-xl text-zinc-400 mb-1">,{String(Math.round((plano.preco % 1) * 100)).padStart(2, '0')}</span>
                      <span className="text-zinc-600 mb-1.5 ml-1">/mês</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-2">
                      ou R$ {(plano.preco * 0.8).toFixed(2).replace('.', ',')}/mês no plano anual
                    </p>
                  </div>

                  {/* Limites */}
                  <div className="grid grid-cols-3 gap-3 mb-6 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{plano.usuarios}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Usuários</p>
                    </div>
                    <div className="text-center border-x border-zinc-800/50">
                      <p className="text-white font-bold text-sm">{plano.leads}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{plano.armazenamento}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Storage</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8 flex-1">
                    {plano.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {f.incluso ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: plano.cor }} />
                        ) : (
                          <X className="w-4 h-4 text-zinc-700 shrink-0" />
                        )}
                        <span className={`text-sm ${f.incluso ? (f.bold ? "text-white font-semibold" : "text-zinc-300") : "text-zinc-600 line-through"}`}>
                          {f.texto}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link 
                    href="/cadastro" 
                    className={`w-full text-center font-bold py-3.5 rounded-xl transition-all duration-200 ${
                      plano.destaque 
                        ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02]" 
                        : "bg-zinc-800 text-white hover:bg-zinc-700"
                    }`}
                  >
                    Começar 7 dias grátis
                  </Link>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-zinc-600 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Sem cartão de crédito
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Ative em 2 minutos
              </div>
              <div className="flex items-center gap-2">
                <X className="w-4 h-4" /> Cancele quando quiser
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-24 bg-zinc-900/50 border-y border-zinc-800/50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">Comparativo completo</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-4 px-3 text-zinc-500 font-medium">Funcionalidade</th>
                    <th className="text-center py-4 px-3 text-green-400 font-bold">Start</th>
                    <th className="text-center py-4 px-3 text-blue-400 font-bold">Pro</th>
                    <th className="text-center py-4 px-3 text-violet-400 font-bold">Black</th>
                  </tr>
                </thead>
                <tbody>
                  <CompRow label="CRM / Leads" start pro black />
                  <CompRow label="Dashboard" start pro black />
                  <CompRow label="Simulador HISCON" start pro black />
                  <CompRow label="Motor de Regras" start pro black />
                  <CompRow label="Esteira (Kanban)" start pro black />
                  <CompRow label="Comissões" start pro black />
                  <CompRow label="Convênios e Tabelas" start pro black />
                  <CompRow label="Credenciais Bancárias" start pro black />
                  <CompRow label="Gov.br Extrator" start pro black />
                  <CompRow label="App Mobile (PWA)" start pro black />
                  <CompRow label="Mapa de Portabilidade" pro black />
                  <CompRow label="Relatórios Avançados" pro black />
                  <CompRow label="Ranking de Vendedores" pro black />
                  <CompRow label="Metas" pro black />
                  <CompRow label="Calendário / Follow-ups" pro black />
                  <CompRow label="Roteiros de Venda" pro black />
                  <CompRow label="Recuperação de Clientes" pro black />
                  <CompRow label="Importação em Massa" pro black />
                  <CompRow label="Auditoria e SLA" pro black />
                  <CompRow label="Dashboard Financeiro" pro black />
                  <CompRow label="IA Avançada + Insights" black />
                  <CompRow label="Inbox Integrado" black />
                  <CompRow label="Automações" black />
                  <CompRow label="RH Completo" black />
                  <CompRow label="Módulo Contábil" black />
                  <CompRow label="Marketing e Campanhas" black />
                  <CompRow label="Mesa de Operações" black />
                  <CompRow label="Base de Conhecimento" black />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-6 text-center relative z-10 space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Pronto para <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">multiplicar</span> seus resultados?
            </h2>
            <p className="text-zinc-400 text-lg">
              Junte-se aos correspondentes que estão usando IA para encontrar oportunidades escondidas na base de clientes.
            </p>
            <Link href="/cadastro" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 text-white font-bold text-lg shadow-xl shadow-violet-500/30 hover:opacity-90 hover:scale-105 transition-all">
              Criar conta grátis <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800/50 bg-zinc-950 py-12 text-center text-zinc-500">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-6 w-6 rounded flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold text-xs">K</div>
          <span className="font-bold text-white">Kromuz</span>
        </div>
        <p>© {new Date().getFullYear()} Kromuz Tecnologia. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-zinc-950/50 border border-zinc-800/50 p-6 rounded-2xl hover:border-violet-500/30 transition group">
      <div className="w-12 h-12 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 group-hover:bg-violet-500/10 transition">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

function CompRow({ label, start, pro, black }: { label: string; start?: boolean; pro?: boolean; black?: boolean }) {
  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition">
      <td className="py-3 px-3 text-zinc-300">{label}</td>
      <td className="text-center py-3 px-3">
        {start ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-700 mx-auto" />}
      </td>
      <td className="text-center py-3 px-3">
        {pro ? <CheckCircle2 className="w-4 h-4 text-blue-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-700 mx-auto" />}
      </td>
      <td className="text-center py-3 px-3">
        {black ? <CheckCircle2 className="w-4 h-4 text-violet-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-700 mx-auto" />}
      </td>
    </tr>
  );
}
