import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { toast } from 'sonner';
import { Lock, CalendarCheck } from 'lucide-react';

const POOL_FEE = 0.15;

function getBrazilNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function getPoolStatus() {
  const now = getBrazilNow();
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (day === 5 && totalMinutes <= 1329) {
    return { available: true, daysLeft: 0 };
  }

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const nextDate = day < 5
    ? new Date(currentYear, currentMonth, 5)
    : new Date(currentYear, currentMonth + 1, 5);
  const daysLeft = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000);
  return { available: false, daysLeft };
}

function getDayProgress(): number {
  const now = getBrazilNow();
  const day = now.getDate();
  if (day <= 5) {
    // Progress from day 1 to day 5: each day = 20%
    const dayFraction = (day - 1) / 4;
    return Math.min(dayFraction * 100, 100);
  }
  // After day 5, show progress toward next month's day 5
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - 5; // days from 5 to end of month
  const elapsed = day - 5;
  return Math.min((elapsed / (remainingDays + 5)) * 100, 99);
}

export default function LoyaltyPool() {
  const { user, withdraw, invest } = usePlatform();
  const earnings = user?.profits ?? 0;
  const feeAmount = earnings * POOL_FEE;
  const netAmount = earnings - feeAmount;
  const { available, daysLeft } = getPoolStatus();
  const progress = getDayProgress();

  const handleWithdrawPool = () => {
    if (!available || netAmount <= 0) return;
    if (withdraw(netAmount)) {
      toast.success(`Saque Pool VX1: ${formatBRL(netAmount)} (taxa 15%: ${formatBRL(feeAmount)})`);
    }
  };

  const handleReinvest = () => {
    if (!available || netAmount <= 0) return;
    if (invest(netAmount, 30, 200)) {
      toast.success(`Reinvestido: ${formatBRL(netAmount)} no ciclo 30 dias (taxa 15%: ${formatBRL(feeAmount)})`);
    }
  };

  return (
    <div className="neon-card">
      <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-3">Pool VX1</h3>
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Próximo dia 5</span>
          <span className="font-mono-data text-neon-cyan">
            {available ? 'Liberado hoje!' : `${daysLeft} dia(s) restante(s)`}
          </span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: available ? '100%' : `${progress}%`,
              background: 'linear-gradient(90deg, hsl(185 100% 50%), hsl(200 100% 55%))',
              boxShadow: '0 0 12px hsl(185 100% 50% / 0.6), 0 0 4px hsl(185 100% 50% / 0.3)',
            }}
          />
        </div>

        {/* Earnings with fee */}
        {earnings > 0 && (
          <div className="p-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15 text-xs space-y-1">
            <p>Rendimentos: <span className="font-mono-data font-bold text-neon-cyan">{formatBRL(earnings)}</span></p>
            <p className="text-muted-foreground">Taxa 15%: -{formatBRL(feeAmount)} → Líquido: <span className="text-neon-green font-bold">{formatBRL(netAmount)}</span></p>
          </div>
        )}

        {/* Status & actions */}
        {available ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-neon-green">
              <CalendarCheck className="w-4 h-4" />
              <span className="font-semibold">Saque/reinvestimento liberado até 22:09</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleWithdrawPool}
                disabled={netAmount <= 0}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none glow-cyan"
              >
                Sacar
              </button>
              <button
                onClick={handleReinvest}
                disabled={netAmount <= 0}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              >
                Reinvestir
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            <span>Liberado todo dia 5 (00:00–22:09 horário de Brasília). Taxa de 15% sobre rendimentos.</span>
          </div>
        )}
      </div>
    </div>
  );
}
