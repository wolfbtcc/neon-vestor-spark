import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const { user, withdraw, loyaltyDays } = usePlatform();
  const [amount, setAmount] = useState('');

  if (!open || !user) return null;

  const handleWithdraw = () => {
    if (loyaltyDays < 7) {
      toast.error('Saque disponível após 7 dias de fidelidade.');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    if (val > user.balance) { toast.error('Saldo insuficiente'); return; }
    if (withdraw(val)) {
      toast.success(`Saque de ${formatBRL(val)} realizado!`);
      setAmount('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md neon-card glow-border-green animate-scale-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4 gradient-text-neon">Sacar</h2>
        <p className="text-sm text-muted-foreground mb-4">Saldo disponível: <span className="font-mono-data text-foreground">{formatBRL(user.balance)}</span></p>
        {loyaltyDays < 7 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
            Saque disponível após 7 dias de fidelidade ({loyaltyDays}/7 dias).
          </div>
        )}
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border focus:border-neon-green/50 focus:outline-none focus:ring-1 focus:ring-neon-green/30 font-mono-data text-lg transition-all"
            />
          </div>
          <button
            onClick={handleWithdraw}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-green"
          >
            Confirmar saque
          </button>
        </div>
      </div>
    </div>
  );
}
