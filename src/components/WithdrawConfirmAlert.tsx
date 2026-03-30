import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, TrendingUp } from 'lucide-react';

interface WithdrawConfirmAlertProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  bonusDays: number;
  bonusPercent: number;
}

export default function WithdrawConfirmAlert({
  open,
  onConfirm,
  onCancel,
  bonusDays,
  bonusPercent,
}: WithdrawConfirmAlertProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm border-destructive/30 bg-background">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle className="text-center text-base">
            TEM CERTEZA QUE DESEJA SACAR AGORA?
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-relaxed space-y-3">
            <p>
              Ao realizar um saque, você irá <span className="text-destructive font-semibold">reiniciar seu progresso de bonificação</span>.
            </p>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 justify-center mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-semibold text-primary text-xs">Bônus de Retenção</span>
              </div>
              <p className="text-muted-foreground">
                A cada 15 dias sem saque você recebe <span className="text-primary font-bold">+10%</span> de rendimento adicional.
              </p>
              {bonusPercent > 0 && (
                <p className="mt-2 text-primary font-semibold">
                  Você está com +{bonusPercent}% de bônus ({bonusDays} dias sem saque)
                </p>
              )}
            </div>
            <p>
              Quanto mais tempo você mantém seu investimento ativo, maior será seu lucro.
            </p>
            <p className="text-destructive/80">
              Se você sacar agora, esse benefício será reiniciado do zero.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={onCancel}
            className="w-full"
            variant="default"
          >
            Manter investimento
          </Button>
          <Button
            onClick={onConfirm}
            variant="outline"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            Continuar saque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
