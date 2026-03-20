import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import DashboardCards from '@/components/DashboardCards';
import LoyaltyPool from '@/components/LoyaltyPool';
import ActiveCycles from '@/components/ActiveCycles';
import AffiliatePanel from '@/components/AffiliatePanel';
import DepositModal from '@/components/DepositModal';
import WithdrawModal from '@/components/WithdrawModal';
import { LogOut, ArrowDownToLine, ArrowUpFromLine, ShieldAlert, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = usePlatform();
  const navigate = useNavigate();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-neon-green" />
            <h1 className="text-lg font-bold gradient-text-neon" style={{ lineHeight: '1.4' }}>NeonVest</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
            {user.isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="p-2 rounded-lg text-neon-blue hover:bg-neon-blue/10 transition-colors active:scale-95"
                title="Admin"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 max-w-5xl">
        <DashboardCards />

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setDepositOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-green"
          >
            <ArrowDownToLine className="w-4 h-4" /> Depositar
          </button>
          <button
            onClick={() => setWithdrawOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-green"
          >
            <ArrowUpFromLine className="w-4 h-4" /> Sacar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ActiveCycles />
            <LoyaltyPool />
          </div>
          <div>
            <AffiliatePanel />
          </div>
        </div>
      </main>

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </div>
  );
}
