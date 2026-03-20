import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { Clock, CheckCircle2, ArrowDownToLine } from 'lucide-react';

export default function ActiveCycles() {
  const { user, investments, redeemCycle } = usePlatform();
  if (!user) return null;

  const userInvestments = investments
    .filter(i => i.userId === user.id && i.status !== 'withdrawn')
    .sort((a, b) => b.startDate - a.startDate);

  if (userInvestments.length === 0) {
    return (
      <div className="neon-card">
        <h3 className="text-lg font-semibold mb-4">Ciclos Ativos</h3>
        <p className="text-muted-foreground text-sm">Nenhum ciclo ativo. Faça um investimento para começar.</p>
      </div>
    );
  }

  return (
    <div className="neon-card">
      <h3 className="text-lg font-semibold mb-4">Ciclos Ativos</h3>
      <div className="space-y-3">
        {userInvestments.map(inv => {
          const isActive = inv.status === 'active';
          const remaining = isActive ? Math.max(0, Math.ceil((inv.endDate - Date.now()) / 86400000)) : 0;
          return (
            <div
              key={inv.id}
              className={`rounded-lg p-4 border transition-all duration-300 ${
                isActive
                  ? 'border-neon-green/20 bg-neon-green/5'
                  : 'border-neon-blue/20 bg-neon-blue/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Clock className="w-4 h-4 text-neon-green animate-pulse-glow" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-neon-blue" />
                  )}
                  <span className="font-semibold text-sm">
                    Ciclo #CYCLE_{inv.cycleNumber.toString().padStart(2, '0')} – {isActive ? 'ATIVO' : 'COMPLETO'}
                  </span>
                </div>
                {!isActive && (
                  <button
                    onClick={() => redeemCycle(inv.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 transition-colors active:scale-95"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    Resgatar
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Investimento: <span className="font-mono-data text-foreground">{formatBRL(inv.amount)}</span>
                {' – '}
                <span className="text-neon-green font-semibold">{inv.returnPercent}% retorno</span>
              </p>
              {isActive && (
                <p className="text-xs text-muted-foreground mt-1">
                  {remaining > 0 ? `${remaining} dia${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}` : 'Finalizando...'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
