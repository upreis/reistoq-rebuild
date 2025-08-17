import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown, Eye, Edit, Package } from "lucide-react";
import type { OrderItem, ListParams } from "@/types/orders";

interface OrdersTableProps {
  orders: OrderItem[];
  loading: boolean;
  filters: ListParams;
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onFiltersChange: (filters: Partial<ListParams>) => void;
  onViewDetails: (item: OrderItem) => void;
  onEdit: (item: OrderItem) => void;
  onProcess: (item: OrderItem) => void;
  getStockStatus?: (item: OrderItem) => 'disponivel' | 'sem-estoque' | 'sem-mapeamento' | 'processado' | 'processando';
}

export function OrdersTable({
  orders,
  loading,
  filters,
  selectedItems,
  onSelectionChange,
  onFiltersChange,
  onViewDetails,
  onEdit,
  onProcess,
  getStockStatus
}: OrdersTableProps) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getSituacaoBadge = (situacao: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'Em Aberto': 'outline',
      'Aprovado': 'default',
      'Preparando Envio': 'secondary',
      'Faturado': 'default',
      'Pronto para Envio': 'secondary',
      'Enviado': 'default',
      'Entregue': 'default',
      'Nao Entregue': 'destructive',
      'Cancelado': 'destructive'
    };

    return (
      <Badge variant={variants[situacao] || 'outline'}>
        {situacao}
      </Badge>
    );
  };

  const getStockBadge = (item: OrderItem) => {
    if (!getStockStatus) return null;
    
    const status = getStockStatus(item);
    const variants: Record<typeof status, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }> = {
      'disponivel': { variant: 'default', text: 'Disponível' },
      'sem-estoque': { variant: 'destructive', text: 'Sem estoque' },
      'sem-mapeamento': { variant: 'outline', text: 'Sem mapeamento' },
      'processado': { variant: 'secondary', text: 'Processado' },
      'processando': { variant: 'outline', text: 'Processando...' }
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    );
  };

  const handleSort = (field: string) => {
    const isCurrentSort = filters.sort === field;
    const newOrder = isCurrentSort && filters.order === 'desc' ? 'asc' : 'desc';
    
    onFiltersChange({
      sort: field,
      order: newOrder,
      page: 1
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(orders.map(order => order.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    }
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Valor Unit.</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Valor Unit.</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                Nenhum pedido encontrado
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  const allSelected = orders.length > 0 && selectedItems.length === orders.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < orders.length;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) (el as any).indeterminate = someSelected;
              }}
              onCheckedChange={handleSelectAll}
              aria-label="Selecionar todos"
            />
            </TableHead>
            <TableHead>
              <SortButton field="situacao">Situação</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="numero_pedido">Pedido</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="nome_cliente">Cliente</SortButton>
            </TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>
              <SortButton field="quantidade">Qtd</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="valor_unitario">Valor Unit.</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="valor_total">Total</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="data_pedido">Data</SortButton>
            </TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(order.id)}
                  onCheckedChange={(checked) => handleSelectItem(order.id, !!checked)}
                  aria-label={`Selecionar pedido ${order.numero_pedido}`}
                />
              </TableCell>
              <TableCell>
                {getSituacaoBadge(order.situacao)}
              </TableCell>
              <TableCell className="font-medium">
                {order.numero_pedido}
                {order.numero_ecommerce && (
                  <div className="text-xs text-muted-foreground">
                    {order.numero_ecommerce}
                  </div>
                )}
              </TableCell>
              <TableCell>{order.nome_cliente}</TableCell>
              <TableCell className="font-mono text-sm">
                {order.sku}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {order.descricao}
              </TableCell>
              <TableCell className="text-right">
                {order.quantidade}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.valor_unitario)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(order.valor_total)}
              </TableCell>
              <TableCell>
                {formatDate(order.data_pedido)}
              </TableCell>
              <TableCell>
                {getStockBadge(order)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(order)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(order)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar pedido
                    </DropdownMenuItem>
                    {order.situacao === 'Aprovado' && (
                      <DropdownMenuItem onClick={() => onProcess(order)}>
                        <Package className="mr-2 h-4 w-4" />
                        Processar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}