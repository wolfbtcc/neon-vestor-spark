import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { X, DollarSign, Wallet, Lock, Clock, Shield, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import WithdrawConfirmAlert from './WithdrawConfirmAlert';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
}

const WITHDRAW_FEE = 0.20; // 20%

function getBrazilTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function getWithdrawStatus(): { available: boolean; message: string; daysLeft: number } {
  const now = getBrazilTime();
  const day = now.getDate();

  if (day === 5) {
    return { available: true, message: 'Saques liberados hoje (dia 5).', daysLeft: 0 };
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

  return {
    available: false,
    message: `Saques disponíveis apenas no dia 5 de cada mês. Faltam ${daysLeft} dia(s).`,
    daysLeft,
  };
}

function isValidBEP20Address(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const { user, withdraw, withdrawals } = usePlatform();
  const [walletName, setWalletName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  if (!open || !user) return null;

  const withdrawStatus = getWithdrawStatus();
  const userWithdrawals = withdrawals.filter(w => w.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const hasPending = userWithdrawals.some(w => w.status === 'pending');

  const val = parseFloat(amount) || 0;
  const fee = val * WITHDRAW_FEE;
  const netAmount = val - fee;

  const triggerWithConfirm = (action: () => void) => {
    setPendingAction(() => action);
    setShowConfirm(true);
  };

  const handleConfirmProceed = () => {
    setShowConfirm(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const handleWithdraw = async () => {
    if (!withdrawStatus.available) { toast.error(withdrawStatus.message); return; }
    if (hasPending) { toast.error('Você já possui um saque pendente. Aguarde o processamento.'); return; }
    if (!walletName.trim()) { toast.error('Informe o nome completo'); return; }
    if (!walletAddress.trim()) { toast.error('Informe o endereço da carteira BEP20'); return; }
    if (!isValidBEP20Address(walletAddress.trim())) { toast.error('Endereço BEP20 inválido. Deve começar com 0x seguido de 40 caracteres hexadecimais.'); return; }
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    if (val < 20) { toast.error('Valor mínimo para saque: $20'); return; }
    if (val > user.profits) { toast.error('Saldo de lucros insuficiente'); return; }

    triggerWithConfirm(async () => {
      const success = await withdraw(val, walletName, walletAddress, 'profits');
      if (success) {
        toast.success(`Saque solicitado! Valor líquido: ${formatBRL(netAmount)}. Processamento em até 48h.`);
        setAmount(''); setWalletName(''); setWalletAddress('');
        onClose();
      } else {
        toast.error('Erro ao processar saque. Verifique as condições.');
      }
    });
  };

  const reset = () => {
    setWalletName(''); setWalletAddress(''); setAmount('');
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

        {/* Withdraw availability status */}
        {!withdrawStatus.available ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-destructive" />
                <p className="font-semibold text-destructive text-xs">Saques Bloqueados</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{withdrawStatus.message}</p>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">ℹ️ Regras de saque:</span>
              </p>
              <ul className="text-[11px] text-muted-foreground mt-2 space-y-1">
                <li>• Saques liberados apenas no <span className="text-neon-cyan font-semibold">dia 5</span> de cada mês</li>
                <li>• Taxa fixa de <span className="text-neon-cyan font-semibold">20%</span> sobre o valor solicitado</li>
                <li>• Valor mínimo: <span className="text-neon-cyan font-semibold">$20</span></li>
                <li>• Processamento em até <span className="text-neon-cyan font-semibold">48 horas</span></li>
                <li>• Exclusivamente via <span className="text-neon-cyan font-semibold">USDT BEP20</span></li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-neon-green/5 border border-neon-green/20 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-neon-green flex-shrink-0" />
              <p className="text-xs font-semibold text-neon-green">Saques liberados hoje!</p>
            </div>

            {hasPending && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400 font-semibold">Você possui um saque pendente. Aguarde o processamento.</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-[10px] text-muted-foreground">Saque exclusivo via <span className="text-primary font-semibold">USDT (BEP20)</span> • Taxa 20% • Processamento em até 48h</p>
            </div>

            <p className="text-xs text-muted-foreground">Lucros disponíveis: <span className="font-mono-data text-neon-cyan">{formatBRL(user.profits)}</span></p>

            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Nome Completo</label>
              <input type="text" value={walletName} onChange={e => setWalletName(e.target.value)} placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm transition-all" />
            </div>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Endereço da Carteira BEP20</label>
              <input type="text" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="0x..."
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm font-mono transition-all" />
              <p className="text-[10px] text-muted-foreground mt-1">Rede: <span className="font-semibold text-foreground">BEP20 (Binance Smart Chain)</span></p>
            </div>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Valor do Saque</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Mínimo 20"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 font-mono-data text-lg transition-all" />
              </div>
            </div>

            {/* Fee breakdown */}
            {val > 0 && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Valor solicitado</span>
                  <span className="font-mono-data text-foreground">{formatBRL(val)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-destructive">Taxa de saque (20%)</span>
                  <span className="font-mono-data text-destructive">-{formatBRL(fee)}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-foreground">Valor líquido</span>
                  <span className="font-mono-data font-bold text-neon-green">{formatBRL(netAmount)}</span>
                </div>
              </div>
            )}

            <button onClick={handleWithdraw} disabled={hasPending}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan disabled:opacity-40 disabled:pointer-events-none">
              Solicitar Saque USDT
            </button>
          </div>
        )}

        {/* Withdrawal history */}
        {userWithdrawals.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Histórico de Saques</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {userWithdrawals.map(w => {
                const d = new Date(w.createdAt);
                const isPending = w.status === 'pending';
                return (
                  <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                    <div className="w-8 h-8 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                      {isPending ? <Clock className="w-4 h-4 text-yellow-400" /> : <DollarSign className="w-4 h-4 text-neon-cyan" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono-data text-sm font-bold text-foreground">{formatBRL(w.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • USDT BEP20
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
      <WithdrawConfirmAlert
        open={showConfirm}
        onConfirm={handleConfirmProceed}
        onCancel={() => { setShowConfirm(false); setPendingAction(null); }}
        bonusDays={0}
        bonusPercent={0}
      />
    </div>
  );
}
