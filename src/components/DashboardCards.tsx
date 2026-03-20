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
      value: formatBRL(user.balance),
      sub: 'Pronto para sacar ou investir',
      icon: Wallet,
      highlight: true,
    },
    {
      label: 'VALOR APLICADO',
      value: formatBRL(user.invested),
      sub: 'Total investido em ciclos',
      icon: TrendingUp,
    },
    {
      label: 'LUCROS',
      value: formatBRL(user.profits),
      sub: 'Rendimentos gerados',
      icon: DollarSign,
    },
    {
      label: 'MOTOR VX1',
      value: activeCycles > 0 ? 'ATIVO' : 'INATIVO',
      sub: `${activeCycles} ciclo(s) ativo(s)`,
      icon: Zap,
      isMotor: true,
      active: activeCycles > 0,
    },
  ];

  return (
    <div className="space-y-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`neon-card overflow-hidden opacity-0 animate-fade-up ${card.isMotor && card.active ? 'animate-glow-pulse' : ''}`}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {card.label}
              </span>
              <Icon className={`w-4 h-4 flex-shrink-0 ${card.isMotor && card.active ? 'text-neon-green animate-pulse-glow' : 'text-neon-cyan'} opacity-70`} />
            </div>
            <p
              className={`font-bold font-mono-data leading-tight overflow-hidden text-ellipsis whitespace-nowrap ${
                card.isMotor
                  ? card.active
                    ? 'text-neon-green text-glow-green text-base'
                    : 'text-muted-foreground text-base'
                  : 'text-neon-cyan text-glow-cyan text-base'
              } ${card.highlight ? 'animate-pulse-neon' : ''}`}
            >
              {card.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
