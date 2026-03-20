import { formatBRL } from '@/lib/platform';
import { usePlatform } from '@/contexts/PlatformContext';
import { Wallet, TrendingUp, DollarSign, Zap } from 'lucide-react';

const cards = [
  { key: 'balance', label: 'Saldo disponível', icon: Wallet, getValue: (u: any) => u.balance },
  { key: 'invested', label: 'Valor aplicado', icon: TrendingUp, getValue: (u: any) => u.invested },
  { key: 'profits', label: 'Lucros', icon: DollarSign, getValue: (u: any) => u.profits },
] as const;

export default function DashboardCards() {
  const { user, investments } = usePlatform();
  if (!user) return null;

  const activeCycles = investments.filter(i => i.userId === user.id && i.status === 'active').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.key}
          className="neon-card opacity-0 animate-fade-up"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <card.icon className="w-4 h-4 text-neon-green opacity-70" />
          </div>
          <p className="text-2xl font-bold font-mono-data gradient-text-neon">
            {formatBRL(card.getValue(user))}
          </p>
        </div>
      ))}
      <div
        className="neon-card glow-border-green opacity-0 animate-fade-up"
        style={{ animationDelay: '240ms', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Motor ativo</span>
          <Zap className="w-4 h-4 text-neon-green animate-pulse-glow" />
        </div>
        <p className="text-2xl font-bold font-mono-data text-neon-green text-glow-green">
          {activeCycles}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {activeCycles === 1 ? 'ciclo ativo' : 'ciclos ativos'}
        </p>
      </div>
    </div>
  );
}
