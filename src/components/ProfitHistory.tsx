import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { History, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import robotIcon from '@/assets/robot-icon.png';

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
          <span className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Rendimentos Diários</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {userProfits.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <img src={robotIcon} alt="VX1 Bot" className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm text-muted-foreground">Nenhum rendimento gerado ainda.</p>
              <p className="text-xs text-muted-foreground">Rendimentos são gerados diariamente (0.6% sobre o capital investido).</p>
            </div>
          ) : (
            userProfits.map(entry => {
              const date = new Date(entry.createdAt);
              const dateStr = date.toLocaleDateString('pt-BR');
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-neon-cyan/[0.03]"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img src={robotIcon} alt="VX1" className="w-10 h-10" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono-data text-neon-green font-bold text-sm">
                      +{formatBRL(entry.net)}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">Rendimento diário • {dateStr}</span>
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
