import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

type Account = { id: string; name?: string | null; account_identifier?: string | null; cnpj?: string | null };

interface MLAccountMultiSelectProps {
  contas: Account[];
  selecionadas: string[]; // lista de IDs
  onChange: (ids: string[]) => void;
}

export function MLAccountMultiSelect({ contas, selecionadas, onChange }: MLAccountMultiSelectProps) {
  const allSelected = useMemo(() => selecionadas.length === contas.length && contas.length > 0, [selecionadas.length, contas.length]);
  const noneSelected = useMemo(() => selecionadas.length === 0, [selecionadas.length]);

  const toggleId = (id: string, checked: boolean) => {
    if (checked) onChange(Array.from(new Set([...selecionadas, id])));
    else onChange(selecionadas.filter((x) => x !== id));
  };

  const handleSelectAll = () => onChange(contas.map((c) => c.id));
  const handleSelectNone = () => onChange([]);

  const label = () => {
    if (allSelected) return `Todas as contas (${contas.length})`;
    if (noneSelected) return `Nenhuma conta`;
    return `${selecionadas.length} selecionada(s)`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="bg-background">
          Contas Mercado Livre
          <span className="ml-2 text-muted-foreground text-xs">{label()}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex items-center justify-between mb-3">
          <Button size="sm" variant="secondary" onClick={handleSelectAll} disabled={contas.length === 0}>Todos</Button>
          <Button size="sm" variant="ghost" onClick={handleSelectNone}>Nenhum</Button>
        </div>
        <div className="max-h-64 overflow-auto space-y-2 pr-1">
          {contas.map((c) => {
            const text = c.name || c.account_identifier || c.cnpj || c.id;
            const checked = selecionadas.includes(c.id);
            return (
              <label key={c.id} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={(v) => toggleId(c.id, Boolean(v))} />
                <Label className="text-sm font-normal">{text}</Label>
              </label>
            );
          })}
          {contas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma conta ativa encontrada.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
