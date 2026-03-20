import { usePlatform } from '@/contexts/PlatformContext';
import { formatBRL } from '@/lib/platform';
import { Users, Link, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliatePanel() {
  const { user, commissions, allUsers } = usePlatform();
  if (!user) return null;

  const userCommissions = commissions.filter(c => c.userId === user.id);
  const totalEarned = userCommissions.reduce((sum, c) => sum + c.amount, 0);
  const referrals = allUsers.filter(u => u.referredBy === user.id);
  const referralLink = `${window.location.origin}?ref=${user.referralCode}`;

  return (
    <div className="neon-card">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-neon-blue" />
        <h3 className="text-lg font-semibold">Programa de Afiliados</h3>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground mb-1">Seu link de referência</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-mono-data text-neon-green truncate flex-1">
            <Link className="w-3 h-3 shrink-0" />
            <span className="truncate">{referralLink}</span>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Link copiado!'); }}
            className="shrink-0 p-1.5 rounded bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-colors active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Indicados</p>
          <p className="text-xl font-bold font-mono-data text-neon-blue">{referrals.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Total ganho</p>
          <p className="text-xl font-bold font-mono-data text-neon-green">{formatBRL(totalEarned)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground mb-2">Comissões por nível</p>
        {[15, 10, 2, 1, 1].map((pct, i) => {
          const lvlComms = userCommissions.filter(c => c.level === i + 1);
          const lvlTotal = lvlComms.reduce((s, c) => s + c.amount, 0);
          return (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/30 transition-colors">
              <span className="text-muted-foreground">Nível {i + 1} ({pct}%)</span>
              <span className="font-mono-data text-foreground">{formatBRL(lvlTotal)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
