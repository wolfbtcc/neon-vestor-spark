import { usePlatform } from '@/contexts/PlatformContext';

export default function LoyaltyPool() {
  const { loyaltyDays } = usePlatform();
  const progress = (loyaltyDays / 7) * 100;

  return (
    <div className="neon-card">
      <h3 className="text-lg font-semibold mb-4">Loyalty Pool</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-mono-data text-neon-green">{loyaltyDays}/7 dias</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(152 70% 45%), hsl(200 80% 50%))',
              boxShadow: '0 0 8px hsl(152 70% 45% / 0.5)',
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {loyaltyDays >= 7
            ? '✅ Saque e reinvestimento disponíveis!'
            : `Saque/reinvestimento disponível após 7 dias de fidelidade.`}
        </p>
      </div>
    </div>
  );
}
