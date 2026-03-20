import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import DashboardCards from '@/components/DashboardCards';
import LoyaltyPool from '@/components/LoyaltyPool';
import ActiveCycles from '@/components/ActiveCycles';
import AffiliatePanel from '@/components/AffiliatePanel';
import DepositModal from '@/components/DepositModal';
import WithdrawModal from '@/components/WithdrawModal';
import { LogOut, ArrowDownToLine, ArrowUpFromLine, Gift, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user, logout, investments, redeemCycle } = usePlatform();
  const navigate = useNavigate();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  const completedCycles = investments.filter(i => i.userId === user.id && i.status === 'completed');

  const handleRedeem = () => {
    if (completedCycles.length === 0) {
      toast.error('Nenhum ciclo completo para resgatar.');
      return;
    }
    completedCycles.forEach(c => redeemCycle(c.id));
    toast.success(`${completedCycles.length} ciclo(s) resgatado(s)!`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">VORTEX</h1>
          <div className="flex items-center gap-3">
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
        {/* Affiliate Link Card */}
        <AffiliatePanel />

        {/* Dashboard value cards */}
        <DashboardCards />

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setDepositOpen(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl neon-card hover:glow-border-cyan transition-all active:scale-[0.97]"
          >
            <ArrowDownToLine className="w-5 h-5 text-neon-cyan" />
            <span className="text-xs font-semibold text-foreground">Depositar</span>
          </button>
          <button
            onClick={() => setWithdrawOpen(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl neon-card hover:glow-border-cyan transition-all active:scale-[0.97]"
          >
            <ArrowUpFromLine className="w-5 h-5 text-neon-cyan" />
            <span className="text-xs font-semibold text-foreground">Sacar</span>
          </button>
          <button
            onClick={handleRedeem}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl neon-card hover:glow-border-cyan transition-all active:scale-[0.97]"
          >
            <Gift className="w-5 h-5 text-neon-green" />
            <span className="text-xs font-semibold text-foreground">Resgatar</span>
          </button>
        </div>

        {/* Active cycles */}
        <ActiveCycles />

        {/* Pool VX1 */}
        <LoyaltyPool />
      </main>

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </div>
  );
}
