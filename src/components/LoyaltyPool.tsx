import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { Lock, CalendarCheck } from 'lucide-react';

function isPoolWithdrawAvailable(): { available: boolean; message: string } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (day === 5) {
    if (totalMinutes <= 1329) {
      return { available: true, message: 'Pool liberado hoje até 22:09 (horário de Brasília).' };
    }
    return { available: false, message: 'Janela do Pool encerrada hoje às 22:09. Aguarde o dia 5 do próximo mês.' };
  }

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let nextDate: Date;
  if (day < 5) {
    nextDate = new Date(currentYear, currentMonth, 5);
  } else {
    nextDate = new Date(currentYear, currentMonth + 1, 5);
  }
  const daysLeft = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000);

  return { available: false, message: `Saque/reinvestimento do Pool disponível apenas no dia 5 de cada mês (00:00–22:09 horário de Brasília). Faltam ${daysLeft} dia(s).` };
}

export default function LoyaltyPool() {
  const { user, profitHistory } = usePlatform();
  if (!user) return null;

  const userProfits = profitHistory.filter(p => p.userId === user.id);
  const poolBalance = userProfits.reduce((sum, p) => sum + (p.fee || 0), 0);

  const poolStatus = isPoolWithdrawAvailable();
  const available = poolStatus.available;

  return (
    <div className="neon-card">
      <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-3">Pool VX1</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Saldo acumulado</span>
          <span className="font-mono-data font-bold text-neon-cyan">{formatBRL(poolBalance)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {available ? (
            <>
              <CalendarCheck className="w-3.5 h-3.5 text-neon-green" />
              <span className="text-neon-green">{poolStatus.message}</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{poolStatus.message}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
