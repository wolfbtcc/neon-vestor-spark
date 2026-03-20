import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { History, Bot, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProfitHistory() {
  const { user, profitHistory } = usePlatform();
  const [expanded, setExpanded] = useState(false);

  if (!user) return null;

  const userProfits = profitHistory
    .filter(p => p.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="neon-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Histórico de Lucros</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {userProfits.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <Bot className="w-8 h-8 mx-auto text-neon-cyan/30" />
              <p className="text-xs text-muted-foreground">Nenhum rendimento gerado ainda.</p>
            </div>
          ) : (
            userProfits.map(entry => {
              const date = new Date(entry.createdAt);
              const dateStr = date.toLocaleDateString('pt-BR');
              const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-neon-cyan/[0.02]"
                >
                  <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0"
                    style={{ boxShadow: '0 0 10px hsl(185 100% 50% / 0.15)' }}>
                    <span className="text-neon-cyan text-xs font-bold" style={{ filter: 'drop-shadow(0 0 4px hsl(185 100% 50% / 0.6))' }}>$</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono-data text-neon-green font-bold text-sm text-glow-green">
                      +{formatBRL(entry.net)}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
