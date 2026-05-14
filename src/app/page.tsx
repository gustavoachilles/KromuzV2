import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { 
  ArrowRight, 
  Brain, 
  BarChart3, 
  MessageSquare, 
  Calculator, 
  ShieldCheck, 
  Rocket, 
  CheckCircle2, 
  FileText
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  try {
    const planos = await prisma.planoSaaS.findMany({
      orderBy: { precoMensal: 'asc' }
    });

    const empresa = await prisma.empresa.findFirst({
      where: { ativo: true }, // Simple logic for now, could be domain based
      select: { corPrimaria: true }
    });
    const corBrand = empresa?.corPrimaria || "#7c3aed";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-brand/30" style={{ "--brand-primary": corBrand } as any}>
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-brand/25">
              K
            </div>
            <span className="font-bold text-xl tracking-tight">Kromuz V2</span>
          </div>
          <div className="flex items-center gap-4">
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand">
              <Rocket className="w-4 h-4" /> A nova era para Corbans e Promotoras
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight">
              A inteligência que <span className="text-brand">multiplica</span> suas comissões.
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Descubra quanto dinheiro está dormindo na sua base de clientes. CRM, Motor de Regras e WhatsApp Automático em um único sistema SaaS.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/analise" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 text-zinc-950 font-bold text-lg shadow-xl shadow-brand/30 hover:opacity-90 hover:scale-105 transition-all">
                Analisar minha base Grátis <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/cadastro" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-8 py-4 text-white font-bold text-lg hover:bg-zinc-800 transition">
                Teste por 14 dias
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-zinc-900 border-y border-zinc-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Tudo que o seu Corban precisa</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">Substitua até 4 ferramentas diferentes por uma plataforma única desenhada para alta performance em crédito consignado.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Brain />}
                title="Motor de Regras Inteligente"
                desc="A Inteligência Artificial lê PDFs de regras bancárias e diz exatamente qual banco aprova o cliente na hora."
              />
              <FeatureCard 
                icon={<MessageSquare />}
                title="WhatsApp Omnichannel"
                desc="Atendimento centralizado no CRM. Seus corretores conversam com os leads sem sair da esteira de vendas."
              />
              <FeatureCard 
                icon={<Calculator />}
                title="Simulador HISCON"
                desc="Upload de extrato do INSS que cruza dados com todos os bancos e entrega a simulação perfeita em segundos."
              />
              <FeatureCard 
                icon={<BarChart3 />}
                title="Gestão de Comissões"
                desc="Controle total sobre o que foi pago, pendente e as regras de repasse para seus vendedores."
              />
              <FeatureCard 
                icon={<FileText />}
                title="Funil de Vendas (Kanban)"
                desc="Acompanhe o status de cada contrato em tempo real, desde a prospecção até a formalização digital."
              />
              <FeatureCard 
                icon={<ShieldCheck />}
                title="Segurança e Isolamento"
                desc="Seus dados estão protegidos em um banco de dados Multi-Tenant, garantindo isolamento total da sua carteira."
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Planos simples e transparentes</h2>
              <p className="text-zinc-400">Escolha o plano ideal para o tamanho da sua operação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {planos.map((plano) => (
                <div key={plano.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col hover:border-violet-500/50 transition">
                  <h3 className="text-xl font-bold text-white mb-2">{plano.nome}</h3>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-black text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plano.precoMensal)}
                    </span>
                    <span className="text-zinc-500 mb-1">/mês</span>
                  </div>
                  
                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                      <span>Até <b>{plano.limiteUsuarios}</b> usuários</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                      <span>Até <b>{plano.limiteLeads}</b> leads na base</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                      <span>CRM e Funil de Vendas</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                      <span>{plano.limiteDisparos > 0 ? `Até ${plano.limiteDisparos} disparos/mês` : 'Sem disparos em massa'}</span>
                    </div>
                  </div>

                  <Link href="/cadastro" className="w-full text-center bg-brand text-zinc-950 font-bold py-3 rounded-xl hover:opacity-90 transition">
                    Começar Trial
                  </Link>
                </div>
              ))}
              {planos.length === 0 && (
                <div className="col-span-3 text-center py-12 text-zinc-500">
                  Planos não configurados. Entre em contato com o suporte.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950 py-12 text-center text-zinc-500">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-6 w-6 rounded flex items-center justify-center bg-brand text-zinc-950 font-bold text-xs">K</div>
          <span className="font-bold text-white">Kromuz</span>
        </div>
        <p>© {new Date().getFullYear()} Kromuz Tecnologia. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
  } catch (err: any) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 text-red-500 font-mono">
        <h1>ERRO INTERNO DETECTADO (Landing Page):</h1>
        <pre>{err.message || String(err)}</pre>
        <pre className="text-xs opacity-50 mt-4">{err.stack}</pre>
      </div>
    );
  }
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl hover:border-violet-500/30 transition group">
      <div className="w-12 h-12 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 group-hover:bg-violet-500/10 transition">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}
