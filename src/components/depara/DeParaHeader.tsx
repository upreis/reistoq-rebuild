import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { DeParaControleAlertas } from "./DeParaControleAlertas";
import { PermissionGate } from "@/components/auth/PermissionGate";

interface DeParaHeaderProps {
  mapeamentosSelecionados: string[];
  onNovoMapeamento: () => void;
  onExcluirSelecionados: () => void;
}

export function DeParaHeader({ 
  mapeamentosSelecionados, 
  onNovoMapeamento, 
  onExcluirSelecionados 
}: DeParaHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 rounded-lg">
          <ArrowLeftRight className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SKU Mapa</h1>
          <p className="text-muted-foreground">Mapeamento de SKUs entre sistemas</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {mapeamentosSelecionados.length > 0 && (
          <PermissionGate required="depara:delete">
            <Button
              variant="destructive"
              size="sm"
              onClick={onExcluirSelecionados}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionados ({mapeamentosSelecionados.length})
            </Button>
          </PermissionGate>
        )}
        
        <DeParaControleAlertas />
        
        <PermissionGate required="depara:create">
          <Button onClick={onNovoMapeamento} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Mapeamento
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}