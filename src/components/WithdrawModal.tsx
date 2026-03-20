import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const { user, withdraw, withdrawals, loyaltyDays } = usePlatform();
  const [pixName, setPixName] = useState('');
  const [amount, setAmount] = useState('');

  if (!open || !user) return null;

  const userWithdrawals = withdrawals.filter(w => w.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);

  const handleWithdraw = () => {
    if (loyaltyDays < 7) {
      toast.error('Saque disponível após 7 dias de fidelidade.');
      return;
    }
    if (!pixName.trim()) { toast.error('Informe o nome do PIX'); return; }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    if (val < 100) { toast.error('Saque mínimo: R$ 100,00'); return; }
    if (val > user.profits) { toast.error('Saldo de lucros insuficiente'); return; }

    // Hidden 10% fee — deduct full from profits, user receives 90%
    const netAmount = val * 0.9;
    if (withdraw(val)) {
      toast.success(`Saque de ${formatBRL(netAmount)} realizado!`);
      setAmount('');
      setPixName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md neon-card glow-border-cyan animate-scale-in max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-display font-bold mb-4 gradient-text-cyan tracking-wide">SACAR</h2>
        <p className="text-xs text-muted-foreground mb-4">Lucros disponíveis: <span className="font-mono-data text-neon-cyan">{formatBRL(user.profits)}</span></p>
        
        {loyaltyDays < 7 && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive mb-4">
            Saque disponível após 7 dias de fidelidade ({loyaltyDays}/7 dias).
          </div>
        )}

        <div className="space-y-3 mb-6">
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
            onClick={handleWithdraw}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan"
          >
            Sacar
          </button>
        </div>

        {/* Withdrawal history */}
        {userWithdrawals.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Histórico de Saques</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
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
    </div>
  );
}
