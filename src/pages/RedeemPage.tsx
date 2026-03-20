import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import { formatBRL, CYCLES } from '@/lib/platform';
import { ArrowLeft, Clock, AlertTriangle, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function RedeemPage() {
  const { user, investments, earlyRedeem } = usePlatform();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pixName, setPixName] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [method, setMethod] = useState<'pix' | 'usdt' | null>(null);

  if (!user) { navigate('/'); return null; }

  const activeCycles = investments.filter(
    i => i.userId === user.id && (i.status === 'active' || i.status === 'completed')
  );

  const selected = activeCycles.find(i => i.id === selectedId);

  const getCycleName = (inv: typeof activeCycles[0]) => {
    const cycle = CYCLES.find(c => c.returnPercent === inv.returnPercent);
    return cycle?.name || 'Ciclo';
  };

  const getDaysActive = (inv: typeof activeCycles[0]) => {
    return Math.floor((Date.now() - inv.startDate) / 86400000);
  };

  const getEarlyFee = (inv: typeof activeCycles[0]) => {
    const daysActive = getDaysActive(inv);
    return daysActive < 20 ? 0.40 : 0;
  };

  const handleStartRedeem = () => {
    if (!selected) return;
    setShowForm(true);
    setMethod(null);
    setPixName('');
    setPixKey('');
  };

  const handleConfirmRedeem = () => {
    if (!selected || !method) return;
    if (method === 'pix' && (!pixName.trim() || !pixKey.trim())) {
      toast.error('Preencha Nome e Chave PIX.');
      return;
    }
    setConfirming(true);
    const success = earlyRedeem(selected.id, pixName, pixKey);
    if (success) {
      toast.success('Resgate solicitado! Aguarde 24h para confirmação.');
      setSelectedId(null);
      setShowForm(false);
      setMethod(null);
    } else {
      toast.error('Erro ao resgatar.');
    }
    setConfirming(false);
  };

  if (activeCycles.length === 0) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container flex items-center h-14 px-4 gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">RESGATAR</h1>
          </div>
        </header>
        <main className="container px-4 py-8 max-w-lg mx-auto">
          <div className="neon-card text-center py-10">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Você não possui ciclos ativos.</p>
            <p className="text-xs text-muted-foreground mt-2">Faça um depósito e escolha um ciclo para começar.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center h-14 px-4 gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">RESGATAR</h1>
        </div>
      </header>

      <main className="container px-4 py-5 max-w-lg mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">Selecione o ciclo que deseja resgatar:</p>

        <div className="space-y-3">
          {activeCycles.map(inv => {
            const cycleName = getCycleName(inv);
            const daysActive = getDaysActive(inv);
            const feePercent = getEarlyFee(inv);
            const isSelected = selectedId === inv.id;

            return (
              <div key={inv.id}>
                <button
                  onClick={() => { setSelectedId(isSelected ? null : inv.id); setShowForm(false); setMethod(null); }}
                  className={`w-full rounded-2xl p-5 border transition-all duration-300 text-left ${
                    isSelected
                      ? 'border-neon-cyan/60 bg-neon-cyan/10 shadow-[0_0_20px_rgba(0,245,255,0.15)]'
                      : 'border-border/50 bg-card/50 hover:border-neon-cyan/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-neon-cyan" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{cycleName}</p>
                        <p className="text-xs text-muted-foreground">{inv.durationDays} dias • {inv.returnPercent}% retorno</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neon-cyan" />
                      <span className="text-xs text-neon-cyan font-semibold">{inv.status === 'active' ? 'ATIVO' : 'COMPLETO'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Capital investido</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{formatBRL(inv.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-muted-foreground">Dias ativos</p>
                    <p className="text-sm font-semibold text-foreground">{daysActive} dia{daysActive !== 1 ? 's' : ''}</p>
                  </div>
                </button>

                {isSelected && !showForm && (
                  <div className="mt-3 rounded-2xl border border-border/50 bg-card/80 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {feePercent > 0 ? (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-amber-400">Taxa de resgate antecipado</p>
                            <p className="text-xs text-amber-400/80 mt-1">
                              Ao resgatar antes de 20 dias, será aplicada uma taxa de <span className="font-bold">40%</span> sobre o capital investido.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-neon-green/10 border border-neon-green/30 p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-neon-green mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-neon-green">Resgate sem taxa</p>
                            <p className="text-xs text-neon-green/80 mt-1">Parabéns! O ciclo já passou de 20 dias. Resgate sem nenhuma taxa.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capital investido</span>
                        <span className="font-mono text-foreground">{formatBRL(inv.amount)}</span>
                      </div>
                      {feePercent > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-400">Taxa de resgate (40%)</span>
                          <span className="font-mono text-amber-400">-{formatBRL(inv.amount * feePercent)}</span>
                        </div>
                      )}
                      <div className="border-t border-border/50 pt-2 flex justify-between text-sm">
                        <span className="font-semibold text-foreground">Valor a receber</span>
                        <span className="font-mono font-bold text-neon-cyan">{formatBRL(inv.amount * (1 - feePercent))}</span>
                      </div>
                    </div>

                    {feePercent > 0 && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        Para reduzir a taxa, deixe o bot trabalhar por pelo menos <span className="text-neon-cyan font-semibold">20 dias</span>.
                        Faltam <span className="text-neon-cyan font-semibold">{Math.max(0, 20 - daysActive)} dia(s)</span>.
                      </p>
                    )}

                    <button
                      onClick={handleStartRedeem}
                      className="w-full py-3.5 rounded-xl bg-neon-cyan/20 text-neon-cyan font-semibold text-sm hover:bg-neon-cyan/30 transition-colors active:scale-[0.98]"
                    >
                      Resgatar {formatBRL(inv.amount * (1 - feePercent))}
                    </button>
                  </div>
                )}

                {/* Payment method form */}
                {isSelected && showForm && (
                  <div className="mt-3 rounded-2xl border border-border/50 bg-card/80 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-sm font-semibold text-foreground">Escolha como receber:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setMethod('pix')}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          method === 'pix' ? 'border-neon-cyan/60 bg-neon-cyan/10' : 'border-border hover:border-neon-cyan/30'
                        }`}
                      >
                        <span className="text-2xl block mb-1">🇧🇷</span>
                        <span className="font-semibold text-sm">PIX</span>
                      </button>
                      <button
                        onClick={() => setMethod('usdt')}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          method === 'usdt' ? 'border-neon-cyan/60 bg-neon-cyan/10' : 'border-border hover:border-neon-cyan/30'
                        }`}
                      >
                        <span className="text-2xl block mb-1">💰</span>
                        <span className="font-semibold text-sm">USDT (BEP20)</span>
                      </button>
                    </div>

                    {method === 'pix' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Nome Completo</label>
                          <input
                            value={pixName} onChange={e => setPixName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:border-neon-cyan/50 focus:outline-none transition-colors"
                            placeholder="Seu nome completo"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Chave PIX</label>
                          <input
                            value={pixKey} onChange={e => setPixKey(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:border-neon-cyan/50 focus:outline-none transition-colors"
                            placeholder="CPF, e-mail, telefone ou chave aleatória"
                          />
                        </div>
                      </div>
                    )}

                    {method === 'usdt' && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Endereço da Carteira (BEP20)</label>
                        <input
                          value={pixKey} onChange={e => setPixKey(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:border-neon-cyan/50 focus:outline-none transition-colors"
                          placeholder="0x..."
                        />
                      </div>
                    )}

                    {method && (
                      <>
                        <div className="flex justify-between text-sm border-t border-border/50 pt-3">
                          <span className="text-muted-foreground">Valor do resgate</span>
                          <span className="font-mono font-bold text-neon-cyan">
                            {formatBRL(inv.amount * (1 - getEarlyFee(inv)))}
                          </span>
                        </div>
                        <button
                          onClick={handleConfirmRedeem}
                          disabled={confirming}
                          className="w-full py-3.5 rounded-xl bg-neon-cyan/20 text-neon-cyan font-semibold text-sm hover:bg-neon-cyan/30 transition-colors active:scale-[0.98] disabled:opacity-50"
                        >
                          {confirming ? 'Processando...' : 'Confirmar Resgate'}
                        </button>
                      </>
                    )}

                    <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
