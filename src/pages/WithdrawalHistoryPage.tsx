import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import { formatBRL } from '@/lib/platform';
import { ArrowLeft, DollarSign, Clock, CheckCircle2 } from 'lucide-react';

export default function WithdrawalHistoryPage() {
  const { user, withdrawals } = usePlatform();
  const navigate = useNavigate();

  if (!user) { navigate('/'); return null; }

  const userWithdrawals = withdrawals
    .filter(w => w.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'profits': return 'Saque de Lucros';
      case 'commission': return 'Saque de Comissão';
      case 'pool': return 'Resgate de Capital';
      default: return 'Saque';
    }
  };

  const isConfirmed = (createdAt: number) => {
    return Date.now() - createdAt >= 24 * 60 * 60 * 1000;
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center h-14 px-4 gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">HISTÓRICO DE SAQUES</h1>
        </div>
      </header>

      <main className="container px-4 py-5 max-w-lg mx-auto space-y-3">
        {userWithdrawals.length === 0 ? (
          <div className="neon-card text-center py-10">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">Nenhum saque realizado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userWithdrawals.map(w => {
              const confirmed = isConfirmed(w.createdAt);
              const date = new Date(w.createdAt);
              return (
                <div key={w.id} className="neon-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 text-neon-cyan" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm text-foreground truncate">{getTypeLabel(w.type)}</p>
                        <span className="font-mono text-sm font-bold text-neon-cyan">{formatBRL(w.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {confirmed ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-neon-green">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Saque Realizado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            Pendente
                          </span>
                        )}
                      </div>
                      {w.pixKey && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          PIX: {w.pixKey}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
