import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { X, DollarSign, Wallet, Lock, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
}

const POOL_FEE = 0.15;

function getBrazilTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function isPoolWithdrawAvailable(): { available: boolean; message: string } {
  const now = getBrazilTime();
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (day === 5) {
    // 00:00 até 22:09 (22*60+9 = 1329 minutos)
    if (totalMinutes <= 1329) {
      return { available: true, message: 'Pool liberado hoje até 22:09 (horário de Brasília).' };
    }
    return { available: false, message: 'Janela do Pool encerrada hoje às 22:09. Aguarde o dia 5 do próximo mês.' };
  }

  // Calculate next day 5
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

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const { user, withdraw, invest, withdrawals } = usePlatform();
  const [mode, setMode] = useState<'choose' | 'profits' | 'pool'>('choose');
  const [pixName, setPixName] = useState('');
  const [amount, setAmount] = useState('');

  if (!open || !user) return null;

  const userWithdrawals = withdrawals.filter(w => w.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const poolStatus = isPoolWithdrawAvailable();
  const poolEarnings = user.profits;
  const poolFee = poolEarnings * POOL_FEE;
  const poolNet = poolEarnings - poolFee;

  const handleWithdrawProfits = () => {
    if (!pixName.trim()) { toast.error('Informe o nome do PIX'); return; }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    if (val < 100) { toast.error('Saque mínimo: R$ 100,00'); return; }
    if (val > user.profits) { toast.error('Saldo de lucros insuficiente'); return; }
    const netAmount = val * 0.9;
    if (withdraw(val)) {
      toast.success(`Saque de ${formatBRL(netAmount)} realizado!`);
      setAmount('');
      setPixName('');
      setMode('choose');
      onClose();
    }
  };

  const handlePoolWithdraw = () => {
    if (!poolStatus.available) return;
    if (poolNet <= 0) { toast.error('Sem rendimentos disponíveis no Pool.'); return; }
    if (withdraw(poolEarnings)) {
      toast.success(`Saque Pool VX1: ${formatBRL(poolNet)} (taxa 15%: ${formatBRL(poolFee)})`);
      setMode('choose');
      onClose();
    }
  };

  const handlePoolReinvest = () => {
    if (!poolStatus.available) return;
    if (poolNet <= 0) { toast.error('Sem rendimentos disponíveis no Pool.'); return; }
    if (invest(poolNet, 30, 200)) {
      toast.success(`Reinvestido: ${formatBRL(poolNet)} no ciclo 30 dias (taxa 15%: ${formatBRL(poolFee)})`);
      setMode('choose');
      onClose();
    }
  };

  const reset = () => {
    setMode('choose');
    setPixName('');
    setAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={reset}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md neon-card glow-border-cyan animate-scale-in max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={reset} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-display font-bold mb-4 gradient-text-cyan tracking-wide">SACAR</h2>

        {/* Step 1: Choose type */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-1">Escolha o tipo de saque:</p>

            {/* Option 1: Withdraw profits */}
            <button
              onClick={() => setMode('profits')}
              className="w-full p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-[0.97] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sacar Lucros</p>
                  <p className="text-[10px] text-muted-foreground">Disponível todos os dias • Mín. R$ 100</p>
                  <p className="text-xs font-mono-data text-neon-cyan mt-0.5">{formatBRL(user.profits)} disponível</p>
                </div>
              </div>
            </button>

            {/* Option 2: Withdraw pool */}
            <button
              onClick={() => setMode('pool')}
              className="w-full p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-[0.97] text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${poolStatus.available ? 'bg-neon-green/10' : 'bg-muted'}`}>
                  {poolStatus.available ? (
                    <CalendarCheck className="w-5 h-5 text-neon-green" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sacar Pool VX1</p>
                  <p className="text-[10px] text-muted-foreground">Liberado dia 5 de cada mês • 00:00–22:09</p>
                  {poolStatus.available ? (
                    <p className="text-[10px] text-neon-green mt-0.5 font-semibold">🟢 Liberado agora</p>
                  ) : (
                    <p className="text-[10px] text-destructive mt-0.5">🔒 Bloqueado</p>
                  )}
                </div>
              </div>
            </button>

            {/* Withdrawal history */}
            {userWithdrawals.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Histórico de Saques</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userWithdrawals.map(w => {
                    const d = new Date(w.createdAt);
                    return (
                      <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="w-8 h-8 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4 text-neon-cyan" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono-data text-sm font-bold text-foreground">{formatBRL(w.amount * 0.9)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20">
                          {w.status === 'completed' ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2a: Withdraw profits */}
        {mode === 'profits' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Lucros disponíveis: <span className="font-mono-data text-neon-cyan">{formatBRL(user.profits)}</span></p>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Nome (PIX)</label>
              <input
                type="text"
                value={pixName}
                onChange={e => setPixName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Valor do saque</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Mínimo 100,00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 font-mono-data text-lg transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleWithdrawProfits}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan"
            >
              Sacar
            </button>
            <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
          </div>
        )}

        {/* Step 2b: Pool withdraw */}
        {mode === 'pool' && (
          <div className="space-y-4">
            {!poolStatus.available ? (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-destructive" />
                  <p className="font-semibold text-destructive text-xs">Pool Bloqueado</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{poolStatus.message}</p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/20 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-neon-green" />
                    <p className="font-semibold text-neon-green text-xs">Pool Liberado</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{poolStatus.message}</p>
                </div>

                {poolEarnings > 0 && (
                  <div className="p-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15 text-xs space-y-1">
                    <p>Rendimentos: <span className="font-mono-data font-bold text-neon-cyan">{formatBRL(poolEarnings)}</span></p>
                    <p className="text-muted-foreground">Taxa 15%: -{formatBRL(poolFee)} → Líquido: <span className="text-neon-green font-bold">{formatBRL(poolNet)}</span></p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handlePoolWithdraw}
                    disabled={poolNet <= 0}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none glow-cyan"
                  >
                    Sacar Pool
                  </button>
                  <button
                    onClick={handlePoolReinvest}
                    disabled={poolNet <= 0}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Reinvestir
                  </button>
                </div>
              </>
            )}

            <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
