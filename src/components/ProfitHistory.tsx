import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { History, X, Bot } from 'lucide-react';

export default function ProfitHistory() {
  const { user, profitHistory } = usePlatform();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const userProfits = profitHistory
    .filter(p => p.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl neon-card hover:glow-border-cyan transition-all active:scale-[0.97]"
      >
        <History className="w-5 h-5 text-neon-cyan" />
        <span className="text-xs font-semibold text-foreground">Histórico de Lucros</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md neon-card glow-border-cyan animate-scale-in max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              {/* Blue neon robot */}
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center"
                  style={{ boxShadow: '0 0 20px hsl(185 100% 50% / 0.3), 0 0 40px hsl(185 100% 50% / 0.1)' }}>
                  <Bot className="w-7 h-7 text-neon-cyan" style={{ filter: 'drop-shadow(0 0 8px hsl(185 100% 50% / 0.8))' }} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-background animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold gradient-text-cyan tracking-wide">LUCROS VX1</h2>
                <p className="text-[10px] text-muted-foreground">Rendimentos gerados pelo motor</p>
              </div>
            </div>

            {userProfits.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Bot className="w-10 h-10 mx-auto text-neon-cyan/30" />
                <p className="text-xs text-muted-foreground">Nenhum rendimento gerado ainda.</p>
                <p className="text-[10px] text-muted-foreground">Invista em um ciclo para começar a gerar lucros.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {userProfits.map(entry => {
                  const date = new Date(entry.createdAt);
                  const dateStr = date.toLocaleDateString('pt-BR');
                  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-neon-cyan/[0.02] hover:bg-neon-cyan/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0"
                        style={{ boxShadow: '0 0 10px hsl(185 100% 50% / 0.15)' }}>
                        <span className="text-neon-cyan text-sm font-bold" style={{ filter: 'drop-shadow(0 0 4px hsl(185 100% 50% / 0.6))' }}>$</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono-data text-neon-green font-bold text-sm text-glow-green">
                            +{formatBRL(entry.net)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-destructive/70">-{formatBRL(entry.fee)} taxa</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
