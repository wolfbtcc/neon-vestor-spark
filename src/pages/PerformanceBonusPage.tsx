import { usePlatform } from '@/contexts/PlatformContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, CheckCircle, Lock } from 'lucide-react';

const TIERS = [
  {
    key: 'start',
    emoji: '🥉',
    color: 'text-orange-400',
    borderColor: 'border-orange-400/30',
    bgColor: 'bg-orange-400/10',
    glowColor: 'shadow-orange-400/20',
    volume: 2000,
    rewards: [{ type: 'pix', value: 200 }],
  },
  {
    key: 'builder',
    emoji: '🥈',
    color: 'text-slate-300',
    borderColor: 'border-slate-300/30',
    bgColor: 'bg-slate-300/10',
    glowColor: 'shadow-slate-300/20',
    volume: 10000,
    rewards: [{ type: 'pix', value: 1000 }],
  },
  {
    key: 'pro',
    emoji: '🥇',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-400/30',
    bgColor: 'bg-yellow-400/10',
    glowColor: 'shadow-yellow-400/20',
    volume: 30000,
    rewards: [{ type: 'pix', value: 5000 }, { type: 'prize', value: 0 }],
  },
  {
    key: 'elite',
    emoji: '💎',
    color: 'text-cyan-300',
    borderColor: 'border-cyan-300/30',
    bgColor: 'bg-cyan-300/10',
    glowColor: 'shadow-cyan-300/20',
    volume: 100000,
    rewards: [{ type: 'pix', value: 15000 }],
  },
];

export default function PerformanceBonusPage() {
  const { user, commissions } = usePlatform();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!user) { navigate('/'); return null; }

  // Calculate total referral volume from commissions at level 1 (direct deposits)
  const userCommissions = commissions.filter(c => c.userId === user.id);
  const totalVolume = userCommissions.reduce((sum, c) => sum + c.amount, 0) / 0.15 * (userCommissions.filter(c => c.level === 1).length > 0 ? 1 : 0);
  
  // Simpler: sum all L1 commission amounts / 0.15 to get the volume
  const l1Commissions = userCommissions.filter(c => c.level === 1);
  const referralVolume = l1Commissions.length > 0 ? l1Commissions.reduce((sum, c) => sum + c.amount, 0) / 0.15 : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center h-14 px-4 gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">{t('bonus.title')}</h1>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-4">
          <Trophy className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
          <h2 className="text-xl font-display font-bold text-foreground">{t('bonus.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t('bonus.subtitle')}</p>
        </div>

        {/* Current progress */}
        <div className="neon-card text-center py-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{t('bonus.your_volume')}</p>
          <p className="text-2xl font-display font-bold text-neon-cyan">
            R$ {referralVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Tiers */}
        {TIERS.map((tier) => {
          const achieved = referralVolume >= tier.volume;
          const progress = Math.min((referralVolume / tier.volume) * 100, 100);

          return (
            <div
              key={tier.key}
              className={`rounded-2xl border p-4 space-y-3 transition-all ${tier.borderColor} ${achieved ? tier.bgColor : 'bg-card'} ${achieved ? `shadow-lg ${tier.glowColor}` : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tier.emoji}</span>
                  <div>
                    <p className={`text-sm font-bold ${tier.color}`}>{t(`bonus.${tier.key}`)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('bonus.refer')} R$ {tier.volume.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                {achieved ? (
                  <CheckCircle className="w-6 h-6 text-neon-green" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground/50" />
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${achieved ? 'bg-neon-green' : 'bg-neon-cyan'}`}
                  style={{ width: `${Math.max(progress, progress > 0 ? 3 : 0)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">
                {progress.toFixed(0)}%
              </p>

              {/* Rewards */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('bonus.rewards')}</p>
                {tier.rewards.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs">👉</span>
                    <p className={`text-sm font-semibold ${achieved ? tier.color : 'text-foreground'}`}>
                      {r.type === 'pix' && `R$ ${r.value.toLocaleString('pt-BR')} ${t('bonus.via_pix')}`}
                      {r.type === 'prize' && t('bonus.iphone')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Info */}
        <div className="neon-card space-y-2">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t('bonus.how')}</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t('bonus.how_text')}</p>
        </div>
      </main>
    </div>
  );
}
