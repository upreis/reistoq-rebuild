import { RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ScannerModeToggleProps {
  continuousMode: boolean;
  onContinuousModeChange: (enabled: boolean) => void;
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  onVibrationEnabledChange: (enabled: boolean) => void;
}

export function ScannerModeToggle({
  continuousMode,
  onContinuousModeChange,
  soundEnabled,
  onSoundEnabledChange,
  vibrationEnabled,
  onVibrationEnabledChange
}: ScannerModeToggleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Configurações do Scanner
        </CardTitle>
        <CardDescription>
          Personalize o comportamento do scanner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="continuous-mode">Modo Contínuo</Label>
            <p className="text-sm text-muted-foreground">
              Continua escaneando após cada leitura
            </p>
          </div>
          <Switch
            id="continuous-mode"
            checked={continuousMode}
            onCheckedChange={onContinuousModeChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-feedback">Feedback Sonoro</Label>
            <p className="text-sm text-muted-foreground">
              Emite som quando código é detectado
            </p>
          </div>
          <Switch
            id="sound-feedback"
            checked={soundEnabled}
            onCheckedChange={onSoundEnabledChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="vibration-feedback">Vibração</Label>
            <p className="text-sm text-muted-foreground">
              Vibra quando código é detectado (mobile)
            </p>
          </div>
          <Switch
            id="vibration-feedback"
            checked={vibrationEnabled}
            onCheckedChange={onVibrationEnabledChange}
          />
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-3">Atalhos de Teclado</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Iniciar/Parar Scanner:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs">Espaço</code>
            </div>
            <div className="flex justify-between">
              <span>Buscar Manual:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs">Enter</code>
            </div>
            <div className="flex justify-between">
              <span>Limpar Resultado:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs">Esc</code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}