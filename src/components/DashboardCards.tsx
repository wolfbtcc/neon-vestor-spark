import { formatBRL } from '@/lib/platform';
import { usePlatform } from '@/contexts/PlatformContext';
import { Wallet, TrendingUp, DollarSign, Zap } from 'lucide-react';

export default function DashboardCards() {
  const { user, investments } = usePlatform();
  if (!user) return null;

  const activeCycles = investments.filter(i => i.userId === user.id && i.status === 'active').length;

  const cards = [
    {
      label: 'SALDO DISPONÍVEL',
      value: formatBRL(user.profits),
      sub: 'Apenas lucros disponíveis',
      icon: Wallet,
      highlight: true,
    },
    {
      label: 'CAPITAL INVESTIDO',
      value: formatBRL(user.invested),
      sub: 'Total depositado em ciclos',
      icon: TrendingUp,
    },
    {
      label: 'LUCROS',
      value: formatBRL(user.profits),
      sub: 'Rendimentos gerados',
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Value cards */}
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`neon-card overflow-hidden opacity-0 animate-fade-up`}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {card.label}
              </span>
              <Icon className="w-5 h-5 flex-shrink-0 text-neon-cyan opacity-70" />
            </div>
            <p
              className={`font-bold font-mono-data leading-tight overflow-hidden text-ellipsis whitespace-nowrap text-xl text-neon-cyan ${card.highlight ? 'animate-pulse-neon' : ''}`}
            >
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </div>
        );
      })}

      {/* Motor VX1 - always visible, fixed card */}
      <div
        className={`neon-card overflow-hidden opacity-0 animate-fade-up ${activeCycles > 0 ? 'animate-glow-pulse' : ''}`}
        style={{ animationDelay: `${3 * 80}ms`, animationFillMode: 'forwards' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            MOTOR VX1
          </span>
          <Zap className={`w-5 h-5 flex-shrink-0 ${activeCycles > 0 ? 'text-neon-green animate-pulse-glow' : 'text-neon-cyan'} opacity-70`} />
        </div>
        <p
          className={`font-bold font-mono-data leading-tight text-xl ${
            activeCycles > 0 ? 'text-neon-green text-glow-green' : 'text-muted-foreground'
          }`}
        >
          {activeCycles > 0 ? 'ATIVO' : 'INATIVO'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{activeCycles} ciclo(s) ativo(s)</p>
      </div>
    </div>
  );
}
