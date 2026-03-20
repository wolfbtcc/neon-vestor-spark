import { usePlatform } from '@/contexts/PlatformContext';
import { Link, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliatePanel() {
  const { user } = usePlatform();
  if (!user) return null;

  const referralLink = `${window.location.origin}?ref=${user.referralCode}`;

  return (
    <div className="neon-card opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
        SEU LINK DE AFILIADO
      </p>
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
  );
}
