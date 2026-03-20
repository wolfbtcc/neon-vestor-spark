import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { toast } from 'sonner';

const POOL_FEE = 0.15;

export default function LoyaltyPool() {
  const { user, loyaltyDays, withdraw, invest } = usePlatform();
  const progress = (loyaltyDays / 7) * 100;
  const canAct = loyaltyDays >= 7;
  const earnings = user?.profits ?? 0;
  const feeAmount = earnings * POOL_FEE;
  const netAmount = earnings - feeAmount;

  const handleWithdrawPool = () => {
    if (!canAct || netAmount <= 0) return;
    if (withdraw(netAmount)) {
      toast.success(`Saque Pool VX1: ${formatBRL(netAmount)} (taxa 15%: ${formatBRL(feeAmount)})`);
    }
  };

  const handleReinvest = () => {
    if (!canAct || netAmount <= 0) return;
    if (invest(netAmount, 30, 200)) {
      toast.success(`Reinvestido: ${formatBRL(netAmount)} no ciclo 30 dias (taxa 15%: ${formatBRL(feeAmount)})`);
    }
  };

  return (
    <div className="neon-card">
      <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-3">Pool VX1</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progresso de fidelidade</span>
          <span className="font-mono-data text-neon-cyan">{loyaltyDays}/7 dias</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(185 100% 50%), hsl(152 70% 45%))',
              boxShadow: '0 0 10px hsl(185 100% 50% / 0.5)',
            }}
          />
        </div>

        {canAct && earnings > 0 && (
          <div className="p-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15 text-xs space-y-1">
            <p>Rendimentos: <span className="font-mono-data font-bold text-neon-cyan">{formatBRL(earnings)}</span></p>
            <p className="text-muted-foreground">Taxa 15%: -{formatBRL(feeAmount)} → Líquido: <span className="text-neon-green font-bold">{formatBRL(netAmount)}</span></p>
          </div>
        )}

        {canAct ? (
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
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Saque/reinvestimento disponível após 7 dias. Taxa de 15% sobre rendimentos.
          </p>
        )}
      </div>
    </div>
  );
}
