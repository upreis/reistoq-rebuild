import { Eye, Edit, Package, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Pedido } from "@/hooks/usePedidos";
import { PermissionGate } from "@/components/auth/PermissionGate";

interface PedidosTabelaProps {
  pedidos: Pedido[];
  loading: boolean;
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itemInicial: number;
  itemFinal: number;
  onPaginaChange: (pagina: number) => void;
  onProximaPagina: () => void;
  onPaginaAnterior: () => void;
  onVerDetalhes: (pedido: Pedido) => void;
  onEditarPedido: (pedido: Pedido) => void;
  onProcessarPedido: (pedido: Pedido) => void;
}

export function PedidosTabela({
  pedidos,
  loading,
  paginaAtual,
  totalPaginas,
  totalItens,
  itemInicial,
  itemFinal,
  onPaginaChange,
  onProximaPagina,
  onPaginaAnterior,
  onVerDetalhes,
  onEditarPedido,
  onProcessarPedido
}: PedidosTabelaProps) {
  
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    // Evitar problemas de timezone ao formatar datas
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const getStatusBadge = (situacao: string) => {
    const statusMap = {
      'pendente': { variant: 'destructive' as const, label: 'Pendente' },
      'processado': { variant: 'default' as const, label: 'Processado' },
      'enviado': { variant: 'secondary' as const, label: 'Enviado' },
      'entregue': { variant: 'default' as const, label: 'Entregue' },
      'cancelado': { variant: 'destructive' as const, label: 'Cancelado' }
    };

    const status = statusMap[situacao as keyof typeof statusMap] || { 
      variant: 'secondary' as const, 
      label: situacao 
    };

    return (
      <Badge variant={status.variant}>
        {status.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando pedidos...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pedidos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum pedido encontrado</CardTitle>
          <CardDescription>
            Não há pedidos que correspondam aos filtros selecionados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum pedido encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            Mostrando {itemInicial} a {itemFinal} de {totalItens} pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>#{pedido.numero}</span>
                      {pedido.numero_ecommerce && (
                        <span className="text-sm text-muted-foreground">
                          E-comm: {pedido.numero_ecommerce}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{pedido.nome_cliente}</span>
                      {pedido.cpf_cnpj && (
                        <span className="text-sm text-muted-foreground">
                          {pedido.cpf_cnpj}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatarData(pedido.data_pedido)}</span>
                      {pedido.data_prevista && (
                        <span className="text-sm text-muted-foreground">
                          Prev: {formatarData(pedido.data_prevista)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatarMoeda(pedido.valor_total)}</span>
                      {(pedido.valor_frete > 0 || pedido.valor_desconto > 0) && (
                        <div className="text-sm text-muted-foreground">
                          {pedido.valor_frete > 0 && `Frete: ${formatarMoeda(pedido.valor_frete)}`}
                          {pedido.valor_desconto > 0 && ` Desc: ${formatarMoeda(pedido.valor_desconto)}`}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(pedido.situacao)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onVerDetalhes(pedido)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <PermissionGate required="pedidos:edit">
                          <DropdownMenuItem onClick={() => onEditarPedido(pedido)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        </PermissionGate>
                        {pedido.situacao === 'pendente' && (
                          <PermissionGate required="pedidos:process">
                            <DropdownMenuItem onClick={() => onProcessarPedido(pedido)}>
                              <Package className="mr-2 h-4 w-4" />
                              Processar
                            </DropdownMenuItem>
                          </PermissionGate>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-2 mt-4">
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
              
              {/* Páginas */}
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                let pageNumber;
                if (totalPaginas <= 5) {
                  pageNumber = i + 1;
                } else if (paginaAtual <= 3) {
                  pageNumber = i + 1;
                } else if (paginaAtual >= totalPaginas - 2) {
                  pageNumber = totalPaginas - 4 + i;
                } else {
                  pageNumber = paginaAtual - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => onPaginaChange(pageNumber)}
                      isActive={pageNumber === paginaAtual}
                      className="cursor-pointer"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPaginas > 5 && paginaAtual < totalPaginas - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
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
      )}
    </>
  );
}