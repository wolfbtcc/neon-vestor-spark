import { usePlatform } from '@/contexts/PlatformContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Zap, Globe, TrendingUp, Shield } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import globeBg from '@/assets/globe-bg.png';

export default function Index() {
  const { user, loading } = usePlatform();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  useEffect(() => {
    if (loading) return;
    if (user) { navigate('/dashboard'); return; }
    if (refCode) { navigate(`/auth?mode=register&ref=${refCode}`); return; }
  }, [user, navigate, refCode, loading]);

  const goAuth = (mode: string) => {
    const params = new URLSearchParams({ mode });
    if (refCode) params.set('ref', refCode);
    navigate(`/auth?${params.toString()}`);
  };

  const storyData = [
    { icon: Globe, titleKey: 'story.1.title', textKey: 'story.1.text' },
    { icon: Zap, titleKey: 'story.2.title', subtitleKey: 'story.2.subtitle', textKey: 'story.2.text' },
    { icon: TrendingUp, titleKey: 'story.3.title', textKey: 'story.3.text' },
    { icon: Shield, titleKey: 'story.4.title', textKey: 'story.4.text' },
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Language selector */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Globe background - larger and more visible, above title */}
      <div className="absolute top-[5%] left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <img
          src={globeBg}
          alt=""
          className="w-[90vw] max-w-[800px] opacity-[0.18] animate-[spin_120s_linear_infinite]"
        />
      </div>

      {/* Ambient glow orbs */}
      <div className="fixed top-[10%] left-[5%] w-48 h-48 rounded-full opacity-15 blur-[80px] pointer-events-none" style={{ background: 'hsl(var(--neon-green))' }} />
      <div className="fixed bottom-[15%] right-[8%] w-56 h-56 rounded-full opacity-10 blur-[90px] pointer-events-none" style={{ background: 'hsl(var(--neon-blue))' }} />

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6 tracking-wide">
            <Zap className="w-3.5 h-3.5" />
            {t('landing.badge')}
          </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-display font-black gradient-text-cyan mb-4 animate-fade-up" style={{ lineHeight: '1.05', animationDelay: '80ms' }}>
          VORTEX
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-md mb-3 animate-fade-up" style={{ animationDelay: '160ms' }}>
          {t('landing.subtitle')} <span className="text-neon-cyan font-semibold text-glow-cyan">VX1</span>
        </p>
        <p className="text-sm text-muted-foreground/70 max-w-sm mb-10 animate-fade-up" style={{ animationDelay: '240ms', textWrap: 'balance' as any }}>
          {t('landing.desc')}
        </p>

        <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '320ms' }}>
          <button
            onClick={() => goAuth('login')}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.97] glow-cyan"
          >
            {t('landing.login')}
          </button>
          <button
            onClick={() => goAuth('register')}
            className="px-6 py-3 rounded-lg border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/10 transition-all active:scale-[0.97]"
          >
            {t('landing.register')}
          </button>
        </div>
      </section>

      {/* Story */}
      <section className="relative z-10 max-w-2xl mx-auto px-4 pb-16 space-y-8">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-center gradient-text-cyan mb-10" style={{ lineHeight: '1.2' }}>
          {t('landing.story_title')}
        </h2>

        {storyData.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="neon-card glow-border-green opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">{t(item.titleKey)}</h3>
                  {item.subtitleKey && (
                    <p className="text-xs text-neon-blue font-medium mb-2">{t(item.subtitleKey)}</p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(item.textKey)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA bottom */}
      <section className="relative z-10 max-w-sm mx-auto px-4 pb-24 text-center space-y-4">
        <p className="text-muted-foreground text-sm">{t('landing.ready')}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => goAuth('login')}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.97] glow-green"
          >
            {t('landing.login')}
          </button>
          <button
            onClick={() => goAuth('register')}
            className="px-6 py-3 rounded-lg border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/10 transition-all active:scale-[0.97]"
          >
            {t('landing.register')}
          </button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/30 py-6 text-center">
        <p className="text-xs text-muted-foreground/50">{t('landing.footer')}</p>
      </footer>
    </div>
  );
}
