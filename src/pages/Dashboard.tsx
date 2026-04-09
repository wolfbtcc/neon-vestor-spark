import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import DashboardCards from '@/components/DashboardCards';
import LoyaltyPool from '@/components/LoyaltyPool';
import ActiveCycles from '@/components/ActiveCycles';
import AffiliatePanel from '@/components/AffiliatePanel';
import DashboardCarousel from '@/components/DashboardCarousel';
import ProfitHistory from '@/components/ProfitHistory';
import DepositModal from '@/components/DepositModal';
import WithdrawModal from '@/components/WithdrawModal';
import LanguageSelector from '@/components/LanguageSelector';
import { LogOut, ArrowDownToLine, ArrowUpFromLine, Gift, ShieldAlert, Menu, X, User, Users, History, RefreshCw, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user, logout, loading } = usePlatform();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-neon-cyan/50 border-t-neon-cyan rounded-full animate-spin" /></div>;

  if (!user) {
    navigate('/');
    return null;
  }

  const handleRedeem = () => {
    navigate('/redeem');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">VORTEX</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <span className="text-xs text-muted-foreground hidden sm:block">{user.name}</span>
            {user.isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="p-2 rounded-lg text-neon-cyan hover:bg-neon-cyan/10 transition-colors active:scale-95"
                title="Admin"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            )}
            {/* Hamburger menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-card border border-border shadow-2xl z-50 overflow-hidden">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-neon-cyan" />
                      <span className="text-sm text-foreground">{t('dash.profile')}</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/team'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Users className="w-4 h-4 text-neon-cyan" />
                      <span className="text-sm text-foreground">{t('dash.team')}</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/withdrawal-history'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <History className="w-4 h-4 text-neon-cyan" />
                      <span className="text-sm text-foreground">{t('dash.history')}</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/cycles'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <RefreshCw className="w-4 h-4 text-neon-cyan" />
                      <span className="text-sm text-foreground">{t('dash.cycles')}</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/bonus'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-foreground">{t('dash.bonus')}</span>
                    </button>
                    <div className="border-t border-border" />
                    <button
                      onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-destructive">{t('dash.logout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-5 space-y-3 max-w-lg mx-auto">
        <AffiliatePanel />
        <DashboardCarousel />
        <DashboardCards />

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setDepositOpen(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl neon-card hover:glow-border-cyan transition-all active:scale-[0.97]"
          >
            <ArrowDownToLine className="w-5 h-5 text-neon-cyan" />
            <span className="text-xs font-semibold text-foreground">{t('dash.deposit')}</span>
          </button>
          <button
            onClick={() => setWithdrawOpen(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl neon-card hover:glow-border-cyan transition-all active:scale-[0.97]"
          >
            <ArrowUpFromLine className="w-5 h-5 text-neon-cyan" />
            <span className="text-xs font-semibold text-foreground">{t('dash.withdraw')}</span>
          </button>
          <button
            onClick={handleRedeem}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl neon-card hover:glow-border-cyan transition-all active:scale-[0.97]"
          >
            <Gift className="w-5 h-5 text-neon-green" />
            <span className="text-xs font-semibold text-foreground">{t('dash.redeem')}</span>
          </button>
        </div>

        <ActiveCycles />
        <ProfitHistory />
        <LoyaltyPool />
      </main>

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </div>
  );
}
