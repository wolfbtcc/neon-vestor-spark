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
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  if (day === 5 && totalMinutes <= 1329) {
    return { available: true, daysLeft: 0 };
  }
  const nextDate = day < 5
    ? new Date(now.getFullYear(), now.getMonth(), 5)
    : new Date(now.getFullYear(), now.getMonth() + 1, 5);
  return { available: false, daysLeft: Math.ceil((nextDate.getTime() - now.getTime()) / 86400000) };
}

export default function LoyaltyPool() {
  const { user, withdraw, invest } = usePlatform();
  const earnings = user?.profits ?? 0;
  const feeAmount = earnings * POOL_FEE;
  const netAmount = earnings - feeAmount;
  const { available, daysLeft } = getPoolStatus();

  // Progress bar based on net earnings relative to total earnings
  const barProgress = earnings > 0 ? (netAmount / earnings) * 100 : 0;

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
        {/* Earnings with fee */}
        {earnings > 0 ? (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Rendimento bruto</span>
              <span className="font-mono-data text-neon-cyan font-bold">{formatBRL(earnings)}</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${barProgress}%`,
                  background: 'linear-gradient(90deg, hsl(185 100% 50%), hsl(200 100% 55%))',
                  boxShadow: '0 0 12px hsl(185 100% 50% / 0.6), 0 0 4px hsl(185 100% 50% / 0.3)',
                }}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Taxa 15%: <span className="text-destructive">-{formatBRL(feeAmount)}</span></span>
              <span className="text-neon-green font-bold font-mono-data">Líquido: {formatBRL(netAmount)}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum rendimento acumulado.</p>
        )}

        {/* Status & actions */}
        {available ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-neon-green">
              <CalendarCheck className="w-4 h-4" />
              <span className="font-semibold">Liberado até 22:09 (horário de Brasília)</span>
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
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Liberado dia 5 (00:00–22:09). Faltam {daysLeft} dia(s).</span>
          </div>
        )}
      </div>
    </div>
  );
}
