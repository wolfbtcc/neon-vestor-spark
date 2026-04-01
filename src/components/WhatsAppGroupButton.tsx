import { usePlatform } from '@/contexts/PlatformContext';
import { MessageCircle } from 'lucide-react';

const GROUP_URL = 'https://chat.whatsapp.com/Bcd8HRz1ZPnBUNvyas1Dvw?mode=gi_t';

export default function WhatsAppGroupButton() {
  const { user } = usePlatform();

  if (!user) return null;

  return (
    <a
      href={GROUP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-[0_0_18px_hsl(var(--neon-cyan)/0.5)] animate-bounce-slow"
      style={{
        background: 'linear-gradient(145deg, hsl(var(--neon-cyan)), hsl(var(--neon-blue)))',
        transform: 'perspective(200px) rotateY(-8deg)',
      }}
    >
      <MessageCircle className="w-4 h-4 text-background" fill="hsl(var(--background))" strokeWidth={0} />
      <span className="text-[10px] font-bold text-background tracking-wide whitespace-nowrap">Grupo Oficial</span>
    </a>
  );
}