import { formatBRL } from '@/lib/platform';
import { usePlatform } from '@/contexts/PlatformContext';
import { Wallet, TrendingUp, DollarSign, Percent } from 'lucide-react';

export default function DashboardCards() {
  const { user } = usePlatform();
  if (!user) return null;

  const dailyYield = user.invested * 0.006;

  const cards = [
    {
      label: 'SALDO DISPONÍVEL',
      value: formatBRL(user.balance),
      sub: 'Saldo total na plataforma',
      icon: Wallet,
      highlight: true,
    },
    {
      label: 'CAPITAL INVESTIDO',
      value: formatBRL(user.invested),
      sub: 'Base de rendimento diário',
      icon: TrendingUp,
    },
    {
      label: 'LUCROS ACUMULADOS',
      value: formatBRL(user.profits),
      sub: 'Total de rendimentos recebidos',
      icon: DollarSign,
    },
    {
      label: 'RENDIMENTO DIÁRIO',
      value: formatBRL(dailyYield),
      sub: '0.6% ao dia sobre capital investido',
      icon: Percent,
      isYield: true,
    },
  ];

  return (
    <div className="space-y-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`neon-card overflow-hidden opacity-0 animate-fade-up`}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-widest text-foreground/80 uppercase">
                {card.label}
              </span>
              <Icon className={`w-5 h-5 flex-shrink-0 opacity-70 ${card.isYield ? 'text-neon-green' : 'text-neon-cyan'}`} />
            </div>
            <p
              className={`font-bold font-mono-data leading-tight overflow-hidden text-ellipsis whitespace-nowrap text-xl ${card.isYield ? 'text-neon-green' : 'text-neon-cyan'} ${card.highlight ? 'animate-pulse-neon' : ''}`}
            >
              {card.value}
            </p>
            <p className="text-xs text-foreground/60 mt-1">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
