import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  nome_produto: string | null;
  quantidade_vendida: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_venda: string;
  created_at: string;
  updated_at: string;
}

interface VendasTabelaProps {
  vendas: HistoricoVenda[];
  loading: boolean;
  vendasSelecionadas: string[];
  todasSelecionadas: boolean;
  paginaAtual: number;
  totalPaginas: number;
  itemInicial: number;
  itemFinal: number;
  totalItens: number;
  onSelecionarVenda: (vendaId: string) => void;
  onSelecionarTodas: () => void;
  onEditarVenda: (venda: HistoricoVenda) => void;
  onExcluirVenda: (id: string) => void;
  onPaginar: (pagina: number) => void;
  onPaginaAnterior: () => void;
  onProximaPagina: () => void;
}

export function VendasTabela({
  vendas,
  loading,
  vendasSelecionadas,
  todasSelecionadas,
  paginaAtual,
  totalPaginas,
  itemInicial,
  itemFinal,
  totalItens,
  onSelecionarVenda,
  onSelecionarTodas,
  onEditarVenda,
  onExcluirVenda,
  onPaginar,
  onPaginaAnterior,
  onProximaPagina,
}: VendasTabelaProps) {
  
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      concluida: { variant: "default" as const, label: "Concluída" },
      pendente: { variant: "secondary" as const, label: "Pendente" },
      cancelada: { variant: "destructive" as const, label: "Cancelada" },
      processando: { variant: "outline" as const, label: "Processando" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: "outline" as const, label: status };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const renderPaginacao = () => {
    if (totalPaginas <= 1) return null;

    const paginas = [];
    const maxPaginas = 7;
    
    let inicio = Math.max(1, paginaAtual - Math.floor(maxPaginas / 2));
    let fim = Math.min(totalPaginas, inicio + maxPaginas - 1);
    
    if (fim - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fim - maxPaginas + 1);
    }

    for (let i = inicio; i <= fim; i++) {
      paginas.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => onPaginar(i)}
            isActive={paginaAtual === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {itemInicial} a {itemFinal} de {totalItens} resultados
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={onPaginaAnterior}
                className={paginaAtual === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {inicio > 1 && (
              <>
                <PaginationItem>
                  <PaginationLink onClick={() => onPaginar(1)} className="cursor-pointer">
                    1
                  </PaginationLink>
                </PaginationItem>
                {inicio > 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
              </>
            )}
            
            {paginas}
            
            {fim < totalPaginas && (
              <>
                {fim < totalPaginas - 1 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink onClick={() => onPaginar(totalPaginas)} className="cursor-pointer">
                    {totalPaginas}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}
            
            <PaginationItem>
              <PaginationNext 
                onClick={onProximaPagina}
                className={paginaAtual === totalPaginas ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
          <CardDescription>Carregando vendas...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (vendas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
          <CardDescription>Nenhuma venda encontrada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma venda encontrada</h3>
            <p className="text-muted-foreground">
              Não há vendas que correspondam aos filtros aplicados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Vendas</CardTitle>
        <CardDescription>
          Lista completa do histórico de vendas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={todasSelecionadas}
                    onCheckedChange={onSelecionarTodas}
                  />
                </TableHead>
                <TableHead>ID Único</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell>
                    <Checkbox
                      checked={vendasSelecionadas.includes(venda.id)}
                      onCheckedChange={() => onSelecionarVenda(venda.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{venda.id_unico}</TableCell>
                  <TableCell className="font-medium">
                    {formatarData(venda.data_venda)}
                  </TableCell>
                  <TableCell>{venda.numero_pedido}</TableCell>
                  <TableCell className="font-mono text-sm">{venda.sku_produto}</TableCell>
                  <TableCell>
                    <div className="font-medium">{venda.nome_produto || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{venda.cliente_nome || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{venda.cliente_documento || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="text-center">{venda.quantidade_vendida}</TableCell>
                  <TableCell>{formatarMoeda(venda.valor_unitario)}</TableCell>
                  <TableCell className="font-medium">
                    {formatarMoeda(venda.valor_total)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(venda.status)}
                  </TableCell>
                  <TableCell className="max-w-32 truncate">
                    <div title={venda.observacoes || ''}>
                      {venda.observacoes || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditarVenda(venda)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onExcluirVenda(venda.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {renderPaginacao()}
      </CardContent>
    </Card>
  );
}