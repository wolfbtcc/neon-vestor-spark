import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import { formatBRL, CYCLES } from '@/lib/platform';
import { ArrowLeft, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import vx1Bot from '@/assets/vx1-bot.png';

export default function CyclesPage() {
  const { user, invest } = usePlatform();
  const navigate = useNavigate();

  if (!user) { navigate('/'); return null; }

  const availableBalance = user.balance;
  const hasBalance = availableBalance > 0;

  const handleSelectCycle = async (cycle: typeof CYCLES[0]) => {
    if (!hasBalance) return;
    const success = await invest(availableBalance, cycle.days, cycle.returnPercent);
    if (success) {
      toast.success(`Investido ${formatBRL(availableBalance)} no ${cycle.name} (${cycle.returnPercent}% em ${cycle.label})`);
      navigate('/dashboard');
    } else {
      toast.error('Erro ao investir.');
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center h-14 px-4 gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">CICLOS VX1</h1>
        </div>
      </header>

      <main className="container px-4 py-5 max-w-lg mx-auto space-y-4">
        {!hasBalance ? (
          <div className="neon-card text-center py-10 space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Saldo insuficiente</p>
            <p className="text-xs text-muted-foreground">Você precisa realizar um depósito antes de escolher um ciclo.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-2 px-6 py-2.5 rounded-xl bg-neon-cyan/20 text-neon-cyan font-semibold text-sm hover:bg-neon-cyan/30 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="neon-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Saldo disponível para investir</p>
              <p className="font-mono text-xl font-bold text-neon-cyan">{formatBRL(availableBalance)}</p>
            </div>

            <p className="text-xs text-muted-foreground">Escolha o ciclo de rendimento:</p>

            <div className="space-y-3">
              {CYCLES.map((cycle, idx) => (
                <button
                  key={cycle.days}
                  onClick={() => handleSelectCycle(cycle)}
                  className="w-full p-5 rounded-2xl border border-border/50 bg-card/50 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-[0.98] text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-xl shrink-0 group-hover:bg-neon-cyan/20 transition-colors">
                      {cycleIcons[idx]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-bold text-foreground">{cycle.name}</span>
                        <Zap className="w-3.5 h-3.5 text-neon-cyan" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ciclo {cycle.label} – <span className="text-neon-green font-bold">{cycle.returnPercent}% retorno</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Lucro estimado: <span className="font-mono text-neon-cyan">{formatBRL(availableBalance * (cycle.returnPercent / 100))}</span>
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
