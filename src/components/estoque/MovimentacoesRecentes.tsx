import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovimentacoes } from "@/hooks/useMovimentacoes";

export function MovimentacoesRecentes() {
  const { movimentacoes, loading } = useMovimentacoes();

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarMotivo = (motivo: string) => {
    const motivos: { [key: string]: string } = {
      'compra': 'Compra',
      'venda': 'Venda',
      'devolucao': 'Devolução',
      'perda': 'Perda',
      'avaria': 'Avaria',
      'ajuste': 'Ajuste de Inventário',
      'transferencia': 'Transferência',
      'outro': 'Outro'
    };
    return motivos[motivo] || motivo;
  };

  const getBadgeVariant = (tipo: string) => {
    return tipo === 'entrada' ? 'secondary' : 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimentações Recentes</CardTitle>
        <CardDescription>
          Últimas entradas e saídas de estoque
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma movimentação registrada ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {movimentacoes.map((movimentacao) => (
              <div key={movimentacao.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="text-sm font-medium">
                    {movimentacao.tipo_movimentacao === 'entrada' ? '+' : '-'}
                    {movimentacao.quantidade_movimentada} - {movimentacao.produtos?.nome || 'Produto não encontrado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {movimentacao.produtos?.sku_interno} | {formatarMotivo(movimentacao.motivo || '')} | {formatarData(movimentacao.created_at)}
                  </p>
                  {movimentacao.observacoes && (
                    <p className="text-xs text-muted-foreground italic">
                      "{movimentacao.observacoes}"
                    </p>
                  )}
                </div>
                <Badge variant={getBadgeVariant(movimentacao.tipo_movimentacao)}>
                  {movimentacao.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}