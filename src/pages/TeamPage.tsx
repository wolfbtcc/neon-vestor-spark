import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Copy, Link, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import { formatBRL, COMMISSION_LEVELS } from '@/lib/platform';
import { toast } from 'sonner';
import { useState } from 'react';

const LEVEL_NAMES = ['Nível 1 – Direto', 'Nível 2', 'Nível 3', 'Nível 4', 'Nível 5'];
const LEVEL_COLORS = ['text-neon-cyan', 'text-neon-green', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];

export default function TeamPage() {
  const { user, allUsers, commissions, withdraw } = usePlatform();
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [pixName, setPixName] = useState('');
  const [amount, setAmount] = useState('');

  if (!user) { navigate('/'); return null; }

  const referralLink = `${window.location.origin}?ref=${user.referralCode}`;
  const userCommissions = commissions.filter(c => c.userId === user.id);
  const totalEarnings = userCommissions.reduce((sum, c) => sum + c.amount, 0);

  // Get referrals per level
  const directReferrals = allUsers.filter(u => u.referredBy === user.id);

  // Build level data
  function getReferralsAtLevel(level: number): typeof allUsers {
    if (level === 0) return directReferrals;
    const parentIds = getReferralsAtLevel(level - 1).map(u => u.id);
    return allUsers.filter(u => u.referredBy && parentIds.includes(u.referredBy));
  }

  const levelData = COMMISSION_LEVELS.map((percent, idx) => {
    const refs = getReferralsAtLevel(idx);
    const levelCommissions = userCommissions.filter(c => c.level === idx + 1);
    const earnings = levelCommissions.reduce((sum, c) => sum + c.amount, 0);
    return { level: idx + 1, percent, refs, earnings, name: LEVEL_NAMES[idx], color: LEVEL_COLORS[idx] };
  });

  const totalReferrals = levelData.reduce((sum, l) => sum + l.refs.length, 0);

  const handleWithdrawCommission = () => {
    if (!pixName.trim()) { toast.error('Informe o nome do PIX'); return; }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    if (val < 100) { toast.error('Saque mínimo: R$ 100,00'); return; }
    if (val > totalEarnings) { toast.error('Saldo de comissão insuficiente'); return; }
    const netAmount = val * 0.9;
    if (withdraw(val)) {
      toast.success(`Saque de ${formatBRL(netAmount)} realizado!`);
      setAmount('');
      setPixName('');
      setShowWithdraw(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center h-14 px-4 gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">MINHA EQUIPE</h1>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* VX1 Global Network title */}
        <div className="text-center py-4">
          <h2 className="text-xl font-display font-bold text-neon-cyan">VX1 Global Network</h2>
          <p className="text-xs text-muted-foreground mt-1">Programa de Afiliados – 5 Níveis</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="neon-card text-center py-4">
            <Users className="w-6 h-6 mx-auto text-neon-cyan mb-1" />
            <p className="text-xl font-display font-bold text-foreground">{totalReferrals}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Indicados</p>
          </div>
          <div className="neon-card text-center py-4">
            <TrendingUp className="w-6 h-6 mx-auto text-neon-green mb-1" />
            <p className="text-xl font-display font-bold text-neon-green">{formatBRL(totalEarnings)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Ganhos de Rede</p>
          </div>
        </div>

        {/* Referral link */}
        <div className="neon-card">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">Link de Convite</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
              <Link className="w-3.5 h-3.5 shrink-0 text-neon-cyan" />
              <span className="text-xs font-mono-data text-neon-cyan truncate">{referralLink}</span>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Link copiado!'); }}
              className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 transition-all active:scale-95"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Withdraw commissions button */}
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4" /> Sacar Comissão
        </button>

        {showWithdraw && (
          <div className="neon-card space-y-3">
            <p className="text-xs text-muted-foreground">Comissão disponível: <span className="font-mono-data text-neon-cyan">{formatBRL(totalEarnings)}</span></p>
            <p className="text-[10px] text-muted-foreground">Disponível diariamente • Mínimo R$ 100</p>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Nome (PIX)</label>
              <input
                type="text" value={pixName} onChange={e => setPixName(e.target.value)} placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] tracking-widest text-muted-foreground mb-1 block uppercase">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <input
                  type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Mínimo 100,00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 font-mono-data text-lg transition-all"
                />
              </div>
            </div>
            <button onClick={handleWithdrawCommission}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-cyan">
              Sacar
            </button>
          </div>
        )}

        {/* 5 Levels */}
        <div className="neon-card space-y-3">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Níveis de Comissão</h3>
          {levelData.map(l => {
            const maxBar = Math.max(...levelData.map(x => x.refs.length), 1);
            const barWidth = (l.refs.length / maxBar) * 100;
            return (
              <div key={l.level} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${l.color}`}>{l.name}</span>
                  <span className="text-xs font-mono-data text-neon-cyan">{l.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-neon-cyan transition-all duration-500"
                    style={{ width: `${Math.max(barWidth, l.refs.length > 0 ? 5 : 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{l.refs.length} indicado(s)</span>
                  <span>{formatBRL(l.earnings)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <div className="neon-card space-y-3">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Como Funciona</h3>
          <div className="space-y-2">
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0 text-xs font-bold text-neon-cyan">1</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Compartilhe seu Link</p>
                <p className="text-[11px] text-muted-foreground">Envie seu link de convite para amigos e contatos.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0 text-xs font-bold text-neon-cyan">2</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Eles se Cadastram e Depositam</p>
                <p className="text-[11px] text-muted-foreground">Quando seu indicado faz um depósito, você ganha comissão automaticamente.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0 text-xs font-bold text-neon-cyan">3</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ganhe em 5 Níveis</p>
                <p className="text-[11px] text-muted-foreground">Você ganha comissão dos depósitos dos seus indicados e dos indicados deles, até 5 níveis de profundidade.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0 text-xs font-bold text-neon-cyan">4</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Exemplo Prático</p>
                <p className="text-[11px] text-muted-foreground">
                  Se você indica João (L1), e João indica Maria (L2), e Maria indica Pedro (L3):
                  Quando Pedro deposita R$ 1.000, você ganha R$ 20 (2% L3), João ganha R$ 100 (10% L2), Maria ganha R$ 150 (15% L1).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Direct referrals list */}
        {directReferrals.length > 0 && (
          <div className="neon-card space-y-3">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Indicados Diretos</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {directReferrals.map(ref => (
                <div key={ref.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="w-9 h-9 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-neon-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ref.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ref.phone || ref.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ref.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
