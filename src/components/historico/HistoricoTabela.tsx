import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit, Trash2, Package, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MovimentacaoHistorico {
  id: string;
  produto_id: string;
  tipo_movimentacao: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  quantidade_movimentada: number;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
  produtos?: {
    nome: string;
    sku_interno: string;
    codigo_barras: string | null;
    quantidade_atual: number;
  };
}

interface HistoricoTabelaProps {
  movimentacoes: MovimentacaoHistorico[];
  loading: boolean;
  movimentacoesSelecionadas: string[];
  todasSelecionadas: boolean;
  paginaAtual: number;
  totalPaginas: number;
  itemInicial: number;
  itemFinal: number;
  totalItens: number;
  onSelecionarMovimentacao: (id: string) => void;
  onSelecionarTodas: () => void;
  onEditarMovimentacao: (movimentacao: MovimentacaoHistorico) => void;
  onExcluirMovimentacao: (movimentacao: MovimentacaoHistorico) => void;
  onPaginar: (pagina: number) => void;
  onPaginaAnterior: () => void;
  onProximaPagina: () => void;
}

export function HistoricoTabela({
  movimentacoes,
  loading,
  movimentacoesSelecionadas,
  todasSelecionadas,
  paginaAtual,
  totalPaginas,
  itemInicial,
  itemFinal,
  totalItens,
  onSelecionarMovimentacao,
  onSelecionarTodas,
  onEditarMovimentacao,
  onExcluirMovimentacao,
  onPaginar,
  onPaginaAnterior,
  onProximaPagina,
}: HistoricoTabelaProps) {

  const getTipoIcon = (tipo: string) => {
    return tipo === 'entrada' ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'entrada' ? (
      <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
        Entrada
      </Badge>
    ) : (
      <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20">
        Saída
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Carregando histórico de movimentações...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Nenhuma movimentação encontrada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma movimentação encontrada
            </h3>
            <p className="text-muted-foreground">
              Não há movimentações registradas ou nenhuma corresponde aos filtros aplicados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Movimentações</CardTitle>
        <CardDescription>
          Mostrando {itemInicial} a {itemFinal} de {totalItens} movimentação(ões)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={todasSelecionadas}
                  onCheckedChange={onSelecionarTodas}
                />
              </TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Quantidades</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentacoes.map((movimentacao) => (
              <TableRow key={movimentacao.id}>
                <TableCell>
                  <Checkbox
                    checked={movimentacoesSelecionadas.includes(movimentacao.id)}
                    onCheckedChange={() => onSelecionarMovimentacao(movimentacao.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {format(new Date(movimentacao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{movimentacao.produtos?.nome || 'Produto não encontrado'}</div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {movimentacao.produtos?.sku_interno || 'N/A'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTipoIcon(movimentacao.tipo_movimentacao)}
                    {getTipoBadge(movimentacao.tipo_movimentacao)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Anterior:</span> {movimentacao.quantidade_anterior}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nova:</span> {movimentacao.quantidade_nova}
                    </div>
                    <div className="font-medium">
                      <span className="text-muted-foreground">Movimentada:</span> {movimentacao.quantidade_movimentada}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={movimentacao.motivo || ''}>
                    {movimentacao.motivo || '-'}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={movimentacao.observacoes || ''}>
                    {movimentacao.observacoes || '-'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditarMovimentacao(movimentacao)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExcluirMovimentacao(movimentacao)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={onPaginaAnterior}
                    className={paginaAtual <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                  <PaginationItem key={pagina}>
                    <PaginationLink
                      onClick={() => onPaginar(pagina)}
                      isActive={paginaAtual === pagina}
                      className="cursor-pointer"
                    >
                      {pagina}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={onProximaPagina}
                    className={paginaAtual >= totalPaginas ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}