import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { getRetentionBonusMultiplier } from '@/contexts/PlatformContext';
import { X, DollarSign, Wallet, Lock, CalendarCheck, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import WithdrawConfirmAlert from './WithdrawConfirmAlert';

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

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const { user, withdraw, invest, withdrawals } = usePlatform();
  const [mode, setMode] = useState<'choose' | 'profits' | 'pool'>('choose');
  const [pixName, setPixName] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  if (!open || !user) return null;

  // Calculate retention bonus info
  const bonusMultiplier = getRetentionBonusMultiplier(user.id);
  const bonusPercent = Math.round(bonusMultiplier * 100);
  const userWithdrawalsSorted = withdrawals.filter(w => w.userId === user.id && (w.type === 'profits' || w.type === 'pool')).sort((a, b) => b.createdAt - a.createdAt);
  const lastWithdrawDate = userWithdrawalsSorted.length > 0 ? userWithdrawalsSorted[0].createdAt : user.createdAt;
  const bonusDays = Math.floor((Date.now() - lastWithdrawDate) / 86400000);

  const userWithdrawals = withdrawals.filter(w => w.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const poolStatus = isPoolWithdrawAvailable();
  const poolEarnings = user.profits;
  const poolFee = poolEarnings * POOL_FEE;
  const poolNet = poolEarnings - poolFee;

  const triggerWithConfirm = (action: () => void) => {
    setPendingAction(() => action);
    setShowConfirm(true);
  };

  const handleConfirmProceed = () => {
    setShowConfirm(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const handleWithdrawProfits = async () => {
    if (!pixName.trim()) { toast.error('Informe o nome'); return; }
    if (!pixKey.trim()) { toast.error('Informe a chave PIX'); return; }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    if (val < 20) { toast.error('Valor mínimo para saque: $20'); return; }
    if (val > user.profits) { toast.error('Saldo de lucros insuficiente'); return; }
    triggerWithConfirm(async () => {
      const success = await withdraw(val, pixName, pixKey, 'profits');
      if (success) {
        toast.success('Saque solicitado com sucesso!');
        setAmount(''); setPixName(''); setPixKey('');
        setMode('choose');
      }
    });
  };

  const handlePoolWithdraw = async () => {
    if (!poolStatus.available) return;
    if (poolNet <= 0) { toast.error('Sem rendimentos disponíveis no Pool.'); return; }
    triggerWithConfirm(async () => {
      const success = await withdraw(poolEarnings, '', '', 'pool');
      if (success) {
        toast.success('Saque Pool VX1 solicitado!');
        setMode('choose');
        onClose();
      }
    });
  };

  const handlePoolReinvest = async () => {
    if (!poolStatus.available) return;
    if (poolNet <= 0) { toast.error('Sem rendimentos disponíveis no Pool.'); return; }
    const success = await invest(poolNet, 30, 200);
    if (success) {
      toast.success(`Reinvestido: ${formatBRL(poolNet)} no ciclo 30 dias`);
      setMode('choose');
      onClose();
    }
  };

  const reset = () => {
    setMode('choose');
    setPixName(''); setPixKey(''); setAmount('');
    onClose();
  };

  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={reset}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md neon-card glow-border-cyan animate-scale-in max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={reset} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-display font-bold mb-4 gradient-text-cyan tracking-wide">SACAR</h2>

        {mode === 'choose' && (
          <div className="space-y-3">
            {/* Retention bonus badge */}
            {bonusPercent > 0 && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary">Bônus de Retenção Ativo: +{bonusPercent}%</p>
                  <p className="text-[10px] text-muted-foreground">{bonusDays} dias sem saque • A cada 15 dias ganha +10%</p>
                </div>
              </div>
            )}
            {bonusPercent === 0 && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Bônus de Retenção: +0%</p>
                  <p className="text-[10px] text-muted-foreground">A cada 15 dias sem saque você ganha +10% de rendimento</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mb-1">Escolha o tipo de saque:</p>

            <button onClick={() => setMode('profits')}
              className="w-full p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-[0.97] text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sacar Lucros</p>
                  <p className="text-[10px] text-muted-foreground">Disponível todos os dias • Mín. $20</p>
                  <p className="text-xs font-mono-data text-neon-cyan mt-0.5">{formatBRL(user.profits)} disponível</p>
                </div>
              </div>
            </button>

            <button onClick={() => setMode('pool')}
              className="w-full p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-[0.97] text-left">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${poolStatus.available ? 'bg-neon-green/10' : 'bg-muted'}`}>
                  {poolStatus.available ? <CalendarCheck className="w-5 h-5 text-neon-green" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sacar Pool VX1</p>
                  <p className="text-[10px] text-muted-foreground">Liberado dia 5 de cada mês • 00:00–22:09</p>
                  {poolStatus.available
                    ? <p className="text-[10px] text-neon-green mt-0.5 font-semibold">🟢 Liberado agora</p>
                    : <p className="text-[10px] text-destructive mt-0.5">🔒 Bloqueado</p>
                  }
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
                    const isPending = w.status === 'pending';
                    const willConfirmAt = w.createdAt + FORTY_EIGHT_HOURS;
                    return (
                      <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="w-8 h-8 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                          {isPending ? <Clock className="w-4 h-4 text-yellow-400" /> : <DollarSign className="w-4 h-4 text-neon-cyan" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono-data text-sm font-bold text-foreground">{formatBRL(w.amount * 0.9)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isPending
                            ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                            : 'bg-neon-green/10 text-neon-green border-neon-green/20'
                        }`}>
                          {isPending ? 'Pendente' : 'Concluído'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Withdraw profits */}
        {mode === 'profits' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Lucros disponíveis: <span className="font-mono-data text-neon-cyan">{formatBRL(user.profits)}</span></p>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Nome Completo</label>
              <input type="text" value={pixName} onChange={e => setPixName(e.target.value)} placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm transition-all" />
            </div>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Chave PIX</label>
              <input type="text" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, email, telefone ou chave aleatória"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm transition-all" />
            </div>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Valor do Saque</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Mínimo 20"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 font-mono-data text-lg transition-all" />
              </div>
            </div>
            <button onClick={handleWithdrawProfits}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan">
              Sacar
            </button>
            <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
          </div>
        )}

        {/* Pool withdraw */}
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

                <div className="flex gap-2">
                  <button onClick={handlePoolWithdraw} disabled={poolNet <= 0}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none glow-cyan">
                    Sacar Pool
                  </button>
                  <button onClick={handlePoolReinvest} disabled={poolNet <= 0}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none">
                    Reinvestir
                  </button>
                </div>
              </>
            )}
            <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
          </div>
        )}
      </div>
      <WithdrawConfirmAlert
        open={showConfirm}
        onConfirm={handleConfirmProceed}
        onCancel={() => { setShowConfirm(false); setPendingAction(null); }}
        bonusDays={bonusDays}
        bonusPercent={bonusPercent}
      />
    </div>
  );
}
