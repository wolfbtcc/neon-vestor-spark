import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, Globe, TrendingUp, Shield } from 'lucide-react';
import globeBg from '@/assets/globe-bg.png';

const storyData = [
  {
    icon: Globe,
    title: 'O Ponto de Ruptura em Singapura',
    text: 'Tudo começou nos servidores de alta vizinhança do centro financeiro de Singapura. Um grupo de engenheiros de sistemas, ex-colaboradores de grandes bolsas de valores, percebeu que o sistema financeiro tradicional era "lento". Enquanto o mundo esperava 24 horas para ver lucros, os grandes bancos ganhavam milhões em milissegundos através de micro-oscilações de câmbio e liquidez.',
  },
  {
    icon: Zap,
    title: 'O Nascimento do VX1',
    subtitle: 'O "Motor de Fluxo"',
    text: 'Eles decidiram que não precisavam mais de bancos. Eles criaram o VX1, um algoritmo de Alta Frequência (HFT) projetado para não dormir. O VX1 não espera o dia acabar para calcular o lucro; ele varre o mercado global em busca de frações de centavos a cada batida de coração. Ele foi apelidado de VORTEX porque ele cria um redemoinho de dados que atrai pequenas margens de lucro de milhares de transações que acontecem ao redor do mundo a cada instante.',
  },
  {
    icon: TrendingUp,
    title: 'A Revolução dos 30 Segundos',
    text: 'A grande inovação do VORTEX foi a quebra da barreira do tempo. Enquanto outras plataformas "travam" o seu dinheiro por dias, o VX1 processa as operações em tempo real. A cada 30 segundos, o VX1 finaliza uma micro-operação global e injeta o lucro diretamente na sua conta. Você não precisa esperar o meio-dia; você vê a sua evolução financeira acontecer ao vivo, segundo a segundo, na palma da sua mão.',
  },
  {
    icon: Shield,
    title: 'O Poder da Escala Global',
    text: 'O VORTEX VX1 conecta o capital de investidores comuns em um único "super-fluxo". Ao colocar apenas $5, o seu saldo se junta ao poder computacional do VX1 para capturar oportunidades que seriam impossíveis sozinho. É a tecnologia de elite, finalmente acessível, entregando resultados na velocidade da internet moderna.',
  },
];

export default function Index() {
  const { user } = usePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const goAuth = (mode: string) => {
    const params = new URLSearchParams({ mode });
    if (refCode) params.set('ref', refCode);
    navigate(`/auth?${params.toString()}`);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Globe background */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <img
          src={globeBg}
          alt=""
          className="w-[80vw] max-w-[700px] opacity-[0.07] animate-[spin_120s_linear_infinite]"
        />
      </div>

      {/* Ambient glow orbs */}
      <div className="fixed top-[10%] left-[5%] w-48 h-48 rounded-full opacity-15 blur-[80px] pointer-events-none" style={{ background: 'hsl(var(--neon-green))' }} />
      <div className="fixed bottom-[15%] right-[8%] w-56 h-56 rounded-full opacity-10 blur-[90px] pointer-events-none" style={{ background: 'hsl(var(--neon-blue))' }} />

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6 tracking-wide">
            <Zap className="w-3.5 h-3.5" />
            ALGORITMO HFT DE ALTA FREQUÊNCIA
          </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-display font-black gradient-text-cyan mb-4 animate-fade-up" style={{ lineHeight: '1.05', animationDelay: '80ms' }}>
          VORTEX
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-md mb-3 animate-fade-up" style={{ animationDelay: '160ms' }}>
          A origem do <span className="text-neon-cyan font-semibold text-glow-cyan">VX1</span>
        </p>
        <p className="text-sm text-muted-foreground/70 max-w-sm mb-10 animate-fade-up" style={{ animationDelay: '240ms', textWrap: 'balance' as any }}>
          Tecnologia de elite acessível. Resultados na velocidade da internet moderna.
        </p>

        <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '320ms' }}>
          <button
            onClick={() => goAuth('login')}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.97] glow-cyan"
          >
            Entrar
          </button>
          <button
            onClick={() => goAuth('register')}
            className="px-6 py-3 rounded-lg border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/10 transition-all active:scale-[0.97]"
          >
            Cadastre-se
          </button>
        </div>
      </section>

      {/* Story */}
      <section className="relative z-10 max-w-2xl mx-auto px-4 pb-16 space-y-8">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-center gradient-text-cyan mb-10" style={{ lineHeight: '1.2' }}>
          A História da VORTEX
        </h2>

        {storyData.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="neon-card glow-border-green opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">{item.title}</h3>
                  {item.subtitle && (
                    <p className="text-xs text-neon-blue font-medium mb-2">{item.subtitle}</p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA bottom */}
      <section className="relative z-10 max-w-sm mx-auto px-4 pb-24 text-center space-y-4">
        <p className="text-muted-foreground text-sm">Pronto para começar?</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => goAuth('login')}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.97] glow-green"
          >
            Entrar
          </button>
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="px-6 py-3 rounded-lg border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/10 transition-all active:scale-[0.97]"
          >
            Cadastre-se
          </button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/30 py-6 text-center">
        <p className="text-xs text-muted-foreground/50">© 2026 VORTEX — Tecnologia VX1</p>
      </footer>
    </div>
  );
}
