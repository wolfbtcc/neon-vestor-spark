import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import { formatBRL } from '@/lib/platform';
import { ArrowLeft, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user, allUsers, investments, deposits, withdrawals, updateUserBalance } = usePlatform();
  const navigate = useNavigate();
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');

  if (!user?.isAdmin) {
    navigate('/');
    return null;
  }

  const nonAdminUsers = allUsers.filter(u => !u.isAdmin);

  const handleAdjust = () => {
    const val = parseFloat(adjustAmount);
    if (!adjustUserId || isNaN(val)) { toast.error('Selecione um usuário e valor'); return; }
    updateUserBalance(adjustUserId, val);
    toast.success('Saldo ajustado!');
    setAdjustAmount('');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex items-center gap-3 h-14 px-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold gradient-text-neon" style={{ lineHeight: '1.4' }}>Painel Admin</h1>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-5xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="neon-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Users className="w-4 h-4" /> Usuários</div>
            <p className="text-2xl font-bold font-mono-data text-neon-green">{nonAdminUsers.length}</p>
          </div>
          <div className="neon-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><DollarSign className="w-4 h-4" /> Depósitos</div>
            <p className="text-2xl font-bold font-mono-data text-neon-blue">{deposits.filter(d => d.status === 'confirmed').length}</p>
          </div>
          <div className="neon-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><DollarSign className="w-4 h-4" /> Saques</div>
            <p className="text-2xl font-bold font-mono-data text-foreground">{withdrawals.length}</p>
          </div>
        </div>

        {/* Balance adjust */}
        <div className="neon-card">
          <h3 className="font-semibold mb-3">Ajustar Saldo</h3>
          <div className="flex gap-3 flex-wrap">
            <select
              value={adjustUserId}
              onChange={e => setAdjustUserId(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:border-neon-green/50 focus:outline-none transition-all"
            >
              <option value="">Selecionar usuário</option>
              {nonAdminUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <input
              type="number"
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
              placeholder="Valor (+ ou -)"
              className="w-40 px-3 py-2 rounded-lg bg-muted border border-border font-mono-data text-sm focus:border-neon-green/50 focus:outline-none transition-all"
            />
            <button onClick={handleAdjust} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.98]">
              Aplicar
            </button>
          </div>
        </div>

        {/* Users table */}
        <div className="neon-card overflow-x-auto">
          <h3 className="font-semibold mb-3">Usuários</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-4">Nome</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4 text-right">Saldo</th>
                <th className="pb-2 pr-4 text-right">Investido</th>
                <th className="pb-2 text-right">Lucros</th>
              </tr>
            </thead>
            <tbody>
              {nonAdminUsers.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-4">{u.name}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{u.email}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-data">{formatBRL(u.balance)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-data">{formatBRL(u.invested)}</td>
                  <td className="py-2.5 text-right font-mono-data text-neon-green">{formatBRL(u.profits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
