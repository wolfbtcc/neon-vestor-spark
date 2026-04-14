import { formatBRL } from '@/lib/platform';
import { usePlatform } from '@/contexts/PlatformContext';
import { Wallet, TrendingUp, DollarSign, Percent } from 'lucide-react';

export default function DashboardCards() {
  const { user } = usePlatform();
  if (!user) return null;

  const dailyYield = user.invested * 0.01 * 0.70; // 1% daily, 70% to user

  const cards = [
    {
      label: 'SALDO DISPONÍVEL',
      value: formatBRL(user.profits),
      sub: 'Lucros disponíveis para saque',
      icon: Wallet,
      highlight: true,
    },
    {
      label: 'CAPITAL INVESTIDO',
      value: formatBRL(user.invested),
      sub: 'Saldo ativo gerando rendimento',
      icon: TrendingUp,
    },
    {
      label: 'RENDIMENTO DIÁRIO',
      value: formatBRL(dailyYield),
      sub: '1% ao dia (70% líquido)',
      icon: Percent,
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
              <Icon className="w-5 h-5 flex-shrink-0 text-neon-cyan opacity-70" />
            </div>
            <p
              className={`font-bold font-mono-data leading-tight overflow-hidden text-ellipsis whitespace-nowrap text-xl text-neon-cyan ${card.highlight ? 'animate-pulse-neon' : ''}`}
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
