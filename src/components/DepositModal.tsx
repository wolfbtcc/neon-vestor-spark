import { useState, useRef } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { X, ArrowRight, Copy, Upload, MessageCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [30, 50, 100, 200, 300, 500, 1000, 3000, 5000, 10000, 15000, 20000, 50000, 100000];
const USDT_WALLET = '0xA1b2C3d4E5f6789012345678AbCdEf9876543210';

export default function DepositModal({ open, onClose }: DepositModalProps) {
  const { deposit } = usePlatform();
  const [step, setStep] = useState<'amount' | 'method' | 'pix' | 'usdt' | 'processing'>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptHash, setReceiptHash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Track used receipt hashes in localStorage
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

  const handleConfirmDeposit = () => {
    if (!selectedAmount || !receipt || !receiptHash) {
      toast.error('Anexe o comprovante para continuar.');
      return;
    }
    // Save hash
    const usedHashes = getUsedHashes();
    usedHashes.push(receiptHash);
    localStorage.setItem(usedHashesKey, JSON.stringify(usedHashes));

    setStep('processing');
    toast.info('Depósito confirmado, aguarde processamento...');

    // Credit after 5 seconds
    setTimeout(() => {
      deposit(selectedAmount, 'usdt');
      toast.success(`Depósito de ${formatBRL(selectedAmount)} creditado!`);
      reset();
    }, 5000);
  };

  const handlePixDeposit = () => {
    if (!selectedAmount) return;
    setStep('processing');
    toast.info('Depósito confirmado, aguarde processamento...');
    setTimeout(() => {
      deposit(selectedAmount, 'pix');
      toast.success(`Depósito de ${formatBRL(selectedAmount)} creditado!`);
      reset();
    }, 5000);
  };

  const reset = () => {
    setStep('amount');
    setSelectedAmount(null);
    setReceipt(null);
    setReceiptHash(null);
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  };

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

        <h2 className="text-lg font-display font-bold mb-5 gradient-text-cyan tracking-wide">DEPOSITAR</h2>

        {/* Step 1: Preset amounts */}
        {step === 'amount' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Selecione o valor do depósito:</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map(val => (
                <button
                  key={val}
                  onClick={() => { setSelectedAmount(val); setStep('method'); }}
                  className="p-3 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-95 text-center"
                >
                  <span className="font-mono-data text-sm font-bold text-foreground">{formatBRL(val)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Payment method */}
        {step === 'method' && selectedAmount && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Valor selecionado: <span className="font-mono-data text-neon-cyan font-bold">{formatBRL(selectedAmount)}</span></p>
            <p className="text-xs text-muted-foreground">Escolha o método de pagamento:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStep('pix')}
                className="p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-95 text-center"
              >
                <span className="text-2xl block mb-1">🇧🇷</span>
                <span className="font-semibold text-sm">PIX</span>
              </button>
              <button
                onClick={() => setStep('usdt')}
                className="p-4 rounded-xl border border-border hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all active:scale-95 text-center"
              >
                <span className="text-2xl block mb-1">💰</span>
                <span className="font-semibold text-sm">USDT (BEP20)</span>
              </button>
            </div>
            <button onClick={() => setStep('amount')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
          </div>
        )}

        {/* Step 3a: PIX flow */}
        {step === 'pix' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15 text-sm space-y-2">
              <p className="text-foreground font-semibold">Depósito via PIX</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Para finalizar seu investimento via Pix, entre em contato com o suporte para receber a chave e concluir o pagamento.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Valor: <span className="font-mono-data text-neon-cyan font-bold">{formatBRL(selectedAmount!)}</span></p>
            <a
              href="https://wa.me/5500000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com Suporte
            </a>

            {/* Receipt upload for PIX */}
            <div className="p-4 rounded-xl border border-border space-y-3">
              <p className="text-xs font-semibold text-foreground">Anexar Comprovante</p>
              <p className="text-[11px] text-muted-foreground">Valor: <span className="font-mono-data text-neon-cyan">{formatBRL(selectedAmount!)}</span></p>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-neon-cyan/40 transition-colors"
              >
                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {receipt ? receipt.name : 'Clique para selecionar imagem'}
                </p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <button
                onClick={handlePixDeposit}
                disabled={!receipt}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar Depósito
              </button>
            </div>

            <button onClick={() => setStep('method')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
          </div>
        )}

        {/* Step 3b: USDT flow */}
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
                <button
                  onClick={() => { navigator.clipboard.writeText(USDT_WALLET); toast.success('Endereço copiado!'); }}
                  className="p-2.5 rounded-lg border border-border hover:border-neon-cyan/50 text-neon-cyan transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Envie o valor selecionado (<span className="font-mono-data text-neon-cyan font-bold">{formatBRL(selectedAmount!)}</span>) via USDT (BEP20) utilizando sua corretora, como Binance. Após o envio, anexe o comprovante abaixo para validação.
            </p>

            {/* Receipt upload */}
            <div className="p-4 rounded-xl border border-border space-y-3">
              <p className="text-xs font-semibold text-foreground">Anexar Comprovante</p>
              <p className="text-[11px] text-muted-foreground">Valor: <span className="font-mono-data text-neon-cyan">{formatBRL(selectedAmount!)}</span></p>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-neon-cyan/40 transition-colors"
              >
                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {receipt ? receipt.name : 'Clique para selecionar imagem'}
                </p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              <button
                onClick={handleConfirmDeposit}
                disabled={!receipt}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar Depósito
              </button>
            </div>
            <button onClick={() => setStep('method')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
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
      </div>
    </div>
  );
}
