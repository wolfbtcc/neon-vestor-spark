import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { CYCLES } from '@/lib/platform';
import { formatBRL } from '@/lib/platform';
import { X, ArrowRight, QrCode, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DepositModal({ open, onClose }: DepositModalProps) {
  const { deposit, invest } = usePlatform();
  const [step, setStep] = useState<'amount' | 'method' | 'cycle' | 'payment'>('amount');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'pix' | 'usdt'>('pix');
  const [selectedCycle, setSelectedCycle] = useState<typeof CYCLES[number] | null>(null);
  const [depositInfo, setDepositInfo] = useState<{ pixCode?: string; walletAddress?: string } | null>(null);

  if (!open) return null;

  const handleDeposit = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Valor inválido');
      return;
    }
    const dep = deposit(val, method);
    setDepositInfo({ pixCode: dep.pixCode, walletAddress: dep.walletAddress });
    setStep('payment');
    toast.success('Depósito sendo processado...');

    if (selectedCycle) {
      setTimeout(() => {
        invest(val, selectedCycle.days, selectedCycle.returnPercent);
        toast.success('Investimento realizado com sucesso!');
      }, 3500);
    }
  };

  const reset = () => {
    setStep('amount');
    setAmount('');
    setMethod('pix');
    setSelectedCycle(null);
    setDepositInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={reset}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md neon-card glow-border-cyan animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={reset} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-display font-bold mb-5 gradient-text-cyan tracking-wide">DEPOSITAR</h2>

        {step === 'amount' && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Valor do depósito</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 font-mono-data text-lg transition-all"
                />
              </div>
            </div>
            <button
              onClick={() => { if (parseFloat(amount) > 0) setStep('cycle'); else toast.error('Insira um valor'); }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan"
            >
              Continuar <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        )}

        {step === 'cycle' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Escolha o ciclo de investimento:</p>
            <div className="grid grid-cols-2 gap-3">
              {CYCLES.map(cycle => (
                <button
                  key={cycle.days}
                  onClick={() => setSelectedCycle(cycle)}
                  className={`p-4 rounded-xl border text-left transition-all active:scale-95 ${
                    selectedCycle?.days === cycle.days
                      ? 'border-neon-cyan/50 bg-neon-cyan/10 glow-cyan'
                      : 'border-border hover:border-neon-cyan/30'
                  }`}
                >
                  <p className="font-bold text-lg">{cycle.label}</p>
                  <p className="text-neon-cyan font-mono-data text-sm">{cycle.returnPercent}% retorno</p>
                </button>
              ))}
            </div>
            {selectedCycle && (
              <div className="p-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15 text-sm">
                <p>Investindo <span className="font-mono-data font-bold">{formatBRL(parseFloat(amount))}</span></p>
                <p>Retorno: <span className="text-neon-cyan font-bold">{formatBRL(parseFloat(amount) * (selectedCycle.returnPercent / 100))}</span></p>
              </div>
            )}
            <button
              onClick={() => { if (selectedCycle) setStep('method'); else toast.error('Selecione um ciclo'); }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan"
            >
              Continuar <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        )}

        {step === 'method' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Método de pagamento:</p>
            <div className="grid grid-cols-2 gap-3">
              {(['pix', 'usdt'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`p-4 rounded-xl border text-center font-semibold uppercase transition-all active:scale-95 ${
                    method === m ? 'border-neon-cyan/50 bg-neon-cyan/10 glow-cyan' : 'border-border hover:border-neon-cyan/30'
                  }`}
                >
                  {m === 'pix' ? '🇧🇷 PIX' : '💰 USDT'}
                </button>
              ))}
            </div>
            <button
              onClick={handleDeposit}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan"
            >
              Depositar {formatBRL(parseFloat(amount))}
            </button>
          </div>
        )}

        {step === 'payment' && depositInfo && (
          <div className="space-y-4 text-center">
            {depositInfo.pixCode ? (
              <>
                <div className="w-28 h-28 mx-auto bg-foreground/10 rounded-xl flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">Código PIX</p>
                  <div className="flex items-center gap-2 justify-center">
                    <code className="text-[11px] font-mono-data bg-muted px-3 py-1.5 rounded-lg break-all">{depositInfo.pixCode}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(depositInfo.pixCode!); toast.success('Copiado!'); }}
                      className="text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Envie USDT para o endereço abaixo:</p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="text-[11px] font-mono-data bg-muted px-3 py-1.5 rounded-lg break-all">{depositInfo.walletAddress}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(depositInfo.walletAddress!); toast.success('Copiado!'); }}
                    className="text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-glow" />
              Aguardando confirmação...
            </div>
            <button onClick={reset} className="w-full py-3 rounded-xl border border-border hover:border-neon-cyan/30 transition-all active:scale-[0.98]">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
