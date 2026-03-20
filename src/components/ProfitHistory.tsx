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
          <History className="w-5 h-5 text-neon-cyan" />
          <span className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Histórico de Lucros</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {userProfits.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Bot className="w-10 h-10 mx-auto text-neon-cyan/30" />
              <p className="text-sm text-muted-foreground">Nenhum rendimento gerado ainda.</p>
            </div>
          ) : (
            userProfits.map(entry => {
              const date = new Date(entry.createdAt);
              const dateStr = date.toLocaleDateString('pt-BR');
              const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-neon-cyan/[0.02]"
                >
                  <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0"
                    style={{ boxShadow: '0 0 12px hsl(185 100% 50% / 0.25), 0 0 24px hsl(185 100% 50% / 0.1)' }}>
                    <Bot className="w-5 h-5 text-neon-cyan" style={{ filter: 'drop-shadow(0 0 6px hsl(185 100% 50% / 0.8)) drop-shadow(0 0 12px hsl(185 100% 50% / 0.4))' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono-data text-neon-green font-bold text-base text-glow-green">
                      +{formatBRL(entry.net)}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{timeStr}</span>
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
