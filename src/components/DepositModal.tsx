import { useState, useRef } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL, CYCLES } from '@/lib/platform';
import { X, Copy, Upload, MessageCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 30, 50, 100, 200, 500, 1000, 2000, 3000, 5000, 10000, 20000, 50000, 100000];
const USDT_WALLET = '0xA1b2C3d4E5f6789012345678AbCdEf9876543210';

export default function DepositModal({ open, onClose }: DepositModalProps) {
  const { deposit, invest } = usePlatform();
  const [step, setStep] = useState<'amount' | 'method' | 'pix' | 'usdt' | 'processing' | 'cycle'>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptHash, setReceiptHash] = useState<string | null>(null);
  const [depositMethod, setDepositMethod] = useState<'pix' | 'usdt'>('pix');
  const fileRef = useRef<HTMLInputElement>(null);

  const usedHashesKey = 'vortex_used_receipts';

  if (!open) return null;

  const getUsedHashes = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(usedHashesKey) || '[]');
    } catch { return []; }
  };

  const hashFile = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const hash = await hashFile(file);
    const usedHashes = getUsedHashes();
    if (usedHashes.includes(hash)) {
      toast.error('Tentativa de duplicação detectada. Conta sujeita a banimento permanente.', { duration: 6000 });
      setReceipt(null);
      setReceiptHash(null);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setReceipt(file);
    setReceiptHash(hash);
  };

  const processDeposit = (method: 'pix' | 'usdt') => {
    if (!selectedAmount || !receipt || !receiptHash) {
      toast.error('Anexe o comprovante para continuar.');
      return;
    }
    const usedHashes = getUsedHashes();
    usedHashes.push(receiptHash);
    localStorage.setItem(usedHashesKey, JSON.stringify(usedHashes));

    setDepositMethod(method);
    setStep('processing');
    toast.info('Depósito confirmado, aguarde processamento...');

    setTimeout(async () => {
      await deposit(selectedAmount, method);
      toast.success(`Depósito de ${formatBRL(selectedAmount)} creditado!`);
      setStep('cycle');
    }, 5000);
  };

  const handleSelectCycle = async (cycle: typeof CYCLES[0]) => {
    if (!selectedAmount) return;
    const success = await invest(selectedAmount, cycle.days, cycle.returnPercent);
    if (success) {
      toast.success(`Investido ${formatBRL(selectedAmount)} no ${cycle.name} (${cycle.returnPercent}% em ${cycle.label})`);
      reset();
    } else {
      toast.error('Erro ao investir. Saldo insuficiente.');
    }
  };

  const reset = () => {
    setStep('amount');
    setSelectedAmount(null);
    setReceipt(null);
    setReceiptHash(null);
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  };

  const cycleIcons = ['⚡', '🌊', '💎', '🔥'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={reset}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md neon-card glow-border-cyan animate-scale-in max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={reset} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-display font-bold mb-5 gradient-text-cyan tracking-wide">
          {step === 'cycle' ? 'ESCOLHA O CICLO' : 'DEPOSITAR'}
        </h2>

        {/* Step 1: Preset amounts */}
        {step === 'amount' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Selecione o valor do depósito:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map(val => {
                const formatted = formatBRL(val);
                const isLarge = val >= 10000;
                return (
                  <button
                    key={val}
                    onClick={() => { setSelectedAmount(val); setStep('method'); }}
                    className="flex items-center justify-center min-h-[56px] p-3 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-95 overflow-hidden"
                  >
                    <span className={`font-mono-data font-bold text-neon-cyan text-glow-cyan text-center leading-tight ${isLarge ? 'text-[11px]' : 'text-sm'}`}>
                      {formatted}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Payment method */}
        {step === 'method' && selectedAmount && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Valor: <span className="font-mono-data text-neon-cyan font-bold">{formatBRL(selectedAmount)}</span></p>
            <p className="text-xs text-muted-foreground">Escolha o método de pagamento:</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep('pix')} className="p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-95 text-center">
                <span className="text-2xl block mb-1">🇧🇷</span>
                <span className="font-semibold text-sm">PIX</span>
              </button>
              <button onClick={() => setStep('usdt')} className="p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-95 text-center">
                <span className="text-2xl block mb-1">💰</span>
                <span className="font-semibold text-sm">USDT (BEP20)</span>
              </button>
            </div>
            <button onClick={() => setStep('amount')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
          </div>
        )}

        {/* Step 3a: PIX */}
        {step === 'pix' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15 text-sm space-y-2">
              <p className="text-foreground font-semibold">Depósito via PIX</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Para finalizar seu investimento via Pix, entre em contato com o suporte para receber a chave e concluir o pagamento.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Valor: <span className="font-mono-data text-neon-cyan font-bold">{formatBRL(selectedAmount!)}</span></p>
            <a <a href="https://wa.link/slgoa3" target="_blank" rel="noopener noreferrer" target="_blank" rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Falar com Suporte
            </a>
            <div className="p-4 rounded-xl border border-border space-y-3">
              <p className="text-xs font-semibold text-foreground">Anexar Comprovante</p>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-neon-cyan/40 transition-colors">
                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{receipt ? receipt.name : 'Clique para selecionar imagem'}</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <button onClick={() => processDeposit('pix')} disabled={!receipt}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan disabled:opacity-40 disabled:cursor-not-allowed">
                Confirmar Depósito
              </button>
            </div>
            <button onClick={() => setStep('method')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
          </div>
        )}

        {/* Step 3b: USDT */}
        {step === 'usdt' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15 text-sm space-y-2">
              <p className="text-foreground font-semibold">Depósito via USDT (BEP20)</p>
              <p className="text-muted-foreground text-xs">Rede: <span className="text-neon-cyan font-bold">BEP20</span></p>
            </div>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Endereço da carteira</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] font-mono-data bg-muted px-3 py-2.5 rounded-lg break-all border border-border">{USDT_WALLET}</code>
                <button onClick={() => { navigator.clipboard.writeText(USDT_WALLET); toast.success('Endereço copiado!'); }}
                  className="p-2.5 rounded-lg border border-border hover:border-neon-cyan/50 text-neon-cyan transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Envie <span className="font-mono-data text-neon-cyan font-bold">{formatBRL(selectedAmount!)}</span> via USDT (BEP20). Após o envio, anexe o comprovante abaixo.
            </p>
            <div className="p-4 rounded-xl border border-border space-y-3">
              <p className="text-xs font-semibold text-foreground">Anexar Comprovante</p>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-neon-cyan/40 transition-colors">
                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{receipt ? receipt.name : 'Clique para selecionar imagem'}</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <button onClick={() => processDeposit('usdt')} disabled={!receipt}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan disabled:opacity-40 disabled:cursor-not-allowed">
                Confirmar Depósito
              </button>
            </div>
            <button onClick={() => setStep('method')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-neon-cyan/50 border-t-neon-cyan animate-spin" />
            <p className="text-sm text-foreground font-semibold">Depósito confirmado</p>
            <p className="text-xs text-muted-foreground">Aguarde processamento...</p>
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-glow" />
              Processando...
            </div>
          </div>
        )}

        {/* Step: Cycle selection */}
        {step === 'cycle' && selectedAmount && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Valor depositado: <span className="font-mono-data text-neon-cyan font-bold">{formatBRL(selectedAmount)}</span>
            </p>
            <p className="text-xs text-muted-foreground">Escolha o ciclo de rendimento:</p>
            <div className="space-y-3">
              {CYCLES.map((cycle, idx) => (
                <button
                  key={cycle.days}
                  onClick={() => handleSelectCycle(cycle)}
                  className="w-full p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-[0.98] text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-neon-cyan/20 transition-colors">
                      {cycleIcons[idx]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-display font-bold text-sm text-foreground">{cycle.name}</span>
                        <Zap className="w-3 h-3 text-neon-cyan" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Ciclo {cycle.label} – <span className="text-neon-green font-bold">{cycle.returnPercent}% retorno</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Lucro estimado: <span className="font-mono-data text-neon-cyan">{formatBRL(selectedAmount * (cycle.returnPercent / 100))}</span>
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
