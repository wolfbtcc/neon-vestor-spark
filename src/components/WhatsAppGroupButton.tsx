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
      className="fixed bottom-20 right-4 z-50 group"
      aria-label="Grupo Oficial WhatsApp"
    >
      <div className="relative flex items-center">
        {/* Label */}
        <span className="absolute right-full mr-2 whitespace-nowrap bg-[#25D366] text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg pointer-events-none">
          Grupo Oficial
        </span>

        {/* 3D animated button */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(37,211,102,0.5)] animate-bounce-slow"
          style={{
            background: 'linear-gradient(145deg, #25D366, #128C7E)',
            transform: 'perspective(200px) rotateY(-8deg)',
          }}
        >
          <MessageCircle className="w-5 h-5 text-white drop-shadow-md" fill="white" strokeWidth={0} />
        </div>
      </div>
    </a>
  );
}
