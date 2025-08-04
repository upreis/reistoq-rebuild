import { Eye, Edit, Play, MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import type { ItemPedido } from "@/hooks/useItensPedidos";
import type { ItemPedidoEnriquecido } from "@/hooks/useDeParaIntegration";

interface PedidosTabelaItensProps {
  itens: ItemPedidoEnriquecido[];
  loading: boolean;
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itemInicial: number;
  itemFinal: number;
  onPaginaChange: (pagina: number) => void;
  onProximaPagina: () => void;
  onPaginaAnterior: () => void;
  onVerDetalhes: (item: ItemPedidoEnriquecido) => void;
  onEditarPedido: (item: ItemPedidoEnriquecido) => void;
  onProcessarPedido: (item: ItemPedidoEnriquecido) => void;
}

export function PedidosTabelaItens({
  itens,
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
}: PedidosTabelaItensProps) {
  
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (situacao: string) => {
    const situacaoLower = situacao.toLowerCase();
    
    switch (situacaoLower) {
      case 'em aberto':
        return <Badge variant="secondary">Em Aberto</Badge>;
      case 'aprovado':
        return <Badge variant="default">Aprovado</Badge>;
      case 'preparando envio':
        return <Badge variant="secondary">Preparando</Badge>;
      case 'faturado':
        return <Badge variant="outline">Faturado</Badge>;
      case 'pronto para envio':
        return <Badge variant="secondary">Pronto</Badge>;
      case 'enviado':
        return <Badge className="bg-blue-600">Enviado</Badge>;
      case 'entregue':
        return <Badge className="bg-green-600">Entregue</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'em separacao':
        return <Badge variant="outline">Separação</Badge>;
      case 'atendido':
        return <Badge className="bg-emerald-600">Atendido</Badge>;
      case 'nao entregue':
        return <Badge variant="destructive">Não Entregue</Badge>;
      default:
        return <Badge variant="outline">{situacao}</Badge>;
    }
  };

  const gerarIdUnico = (item: ItemPedidoEnriquecido) => {
    return `${item.numero_pedido}-${item.sku}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando itens...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (itens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum item encontrado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não há itens de pedidos que correspondam aos filtros aplicados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Itens de Pedidos ({totalItens} {totalItens === 1 ? 'item' : 'itens'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Único</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>E-commerce</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>SKU Estoque</TableHead>
                <TableHead>SKU KIT</TableHead>
                <TableHead>Qtd KIT</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Total Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Pedido</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Frete</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Rastreamento</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    {gerarIdUnico(item)}
                  </TableCell>
                  <TableCell className="font-medium">
                    #{item.numero_pedido}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.numero_ecommerce || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-48 truncate">
                      {item.nome_cliente}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.cpf_cnpj || '-'}
                  </TableCell>
                  <TableCell className={item.linha_destacada ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}>
                    <div className="space-y-1">
                      <div className="font-mono text-sm">{item.sku}</div>
                      {item.sku_estoque && item.sku_estoque !== item.sku && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <ExternalLink className="h-3 w-3" />
                          {item.sku_estoque}
                        </div>
                      )}
                      {item.mapeamento_aplicado?.sku_simples && (
                        <div className="text-xs text-blue-600">
                          Simples: {item.mapeamento_aplicado.sku_simples}
                        </div>
                      )}
                      {item.linha_destacada && (
                        <div className="text-xs text-orange-600 font-medium">
                          ⚠️ Sem mapeamento
                        </div>
                      )}
                    </div>
                   </TableCell>
                   <TableCell className="font-mono text-sm">
                     {item.mapeamento_aplicado?.sku_correspondente || item.sku_estoque || '-'}
                   </TableCell>
                   <TableCell className="font-mono text-sm">
                     {item.mapeamento_aplicado?.sku_simples || '-'}
                   </TableCell>
                   <TableCell className="text-center">
                     {item.mapeamento_aplicado?.quantidade || '-'}
                   </TableCell>
                   <TableCell>
                     <div className="max-w-60 truncate">
                       {item.descricao}
                      {item.produto_nome && item.produto_nome !== item.descricao && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Estoque: {item.produto_nome}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.quantidade}
                  </TableCell>
                  <TableCell>
                    {formatarMoeda(item.valor_unitario)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatarMoeda(item.valor_total)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.situacao)}
                  </TableCell>
                  <TableCell>
                    {formatarData(item.data_pedido)}
                  </TableCell>
                  <TableCell>
                    {item.data_prevista ? formatarData(item.data_prevista) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.estoque_atual !== undefined ? (
                      <div className={`text-center ${
                        item.estoque_atual < item.quantidade 
                          ? 'text-red-600 font-semibold' 
                          : item.estoque_atual === 0 
                            ? 'text-orange-600' 
                            : 'text-green-600'
                      }`}>
                        {item.estoque_atual}
                        {item.estoque_atual < item.quantidade && (
                          <div className="text-xs">Insuficiente</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.valor_frete ? formatarMoeda(item.valor_frete) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.valor_desconto ? formatarMoeda(item.valor_desconto) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {item.codigo_rastreamento && (
                        <div className="font-mono text-xs">{item.codigo_rastreamento}</div>
                      )}
                      {item.url_rastreamento && (
                        <a 
                          href={item.url_rastreamento} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Rastrear
                        </a>
                      )}
                      {!item.codigo_rastreamento && !item.url_rastreamento && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 max-w-32">
                      {item.obs && (
                        <div className="text-xs text-muted-foreground truncate" title={item.obs}>
                          📝 {item.obs}
                        </div>
                      )}
                      {item.obs_interna && (
                        <div className="text-xs text-orange-600 truncate" title={item.obs_interna}>
                          🔒 {item.obs_interna}
                        </div>
                      )}
                      {item.observacoes && (
                        <div className="text-xs text-blue-600 truncate" title={item.observacoes}>
                          💬 {item.observacoes}
                        </div>
                      )}
                      {!item.obs && !item.obs_interna && !item.observacoes && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onVerDetalhes(item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditarPedido(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Pedido
                        </DropdownMenuItem>
                        {item.situacao.toLowerCase() === 'aprovado' && (
                          <DropdownMenuItem onClick={() => onProcessarPedido(item)}>
                            <Play className="mr-2 h-4 w-4" />
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

        {/* Informações da paginação */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {itemInicial} a {itemFinal} de {totalItens} item(ns)
          </div>
          
          {totalPaginas > 1 && (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}