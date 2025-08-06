import { useState } from "react";
import { 
  Eye, Edit, Play, MoreHorizontal, ExternalLink, Copy, 
  Clock, TrendingUp, TrendingDown, AlertTriangle, Download, CheckSquare, Square 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { ItemPedido } from "@/hooks/useItensPedidos";
import type { ItemPedidoEnriquecido } from "@/hooks/useDeParaIntegration";

interface PedidosTabelaAvancadaProps {
  itens: ItemPedidoEnriquecido[];
  itensSelecionados: ItemPedidoEnriquecido[];
  onSelecaoChange: (itens: ItemPedidoEnriquecido[]) => void;
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
  obterStatusEstoque?: (item: ItemPedidoEnriquecido) => string;
}

export function PedidosTabelaAvancada({
  itens,
  itensSelecionados,
  onSelecaoChange,
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
  onProcessarPedido,
  obterStatusEstoque
}: PedidosTabelaAvancadaProps) {

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

  const calcularTempoDecorrido = (dataPedido: string) => {
    const agora = new Date();
    const pedido = new Date(dataPedido);
    const diffTime = Math.abs(agora.getTime() - pedido.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Há 1 dia";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    return `Há ${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
  };

  const obterCorTempoDecorrido = (dataPedido: string) => {
    const agora = new Date();
    const pedido = new Date(dataPedido);
    const diffTime = Math.abs(agora.getTime() - pedido.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return "text-green-600";
    if (diffDays <= 3) return "text-yellow-600";
    if (diffDays <= 7) return "text-orange-600";
    return "text-red-600";
  };

  const calcularMargemLucro = (item: ItemPedidoEnriquecido) => {
    // Mock calculation - in real app, would get cost from product data
    const custoProduto = item.valor_unitario * 0.6; // Assumindo 60% de custo
    const margem = ((item.valor_unitario - custoProduto) / item.valor_unitario) * 100;
    return margem;
  };

  const obterPrioridade = (item: ItemPedidoEnriquecido) => {
    const valor = item.valor_total;
    const margem = calcularMargemLucro(item);
    
    if (valor > 500 || margem > 50) return { nivel: "alta", cor: "text-red-600", icon: AlertTriangle };
    if (valor > 200 || margem > 30) return { nivel: "média", cor: "text-yellow-600", icon: Clock };
    return { nivel: "baixa", cor: "text-green-600", icon: TrendingUp };
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

  const getStatusProcessamentoComEstoque = (item: ItemPedidoEnriquecido) => {
    if (obterStatusEstoque) {
      const status = obterStatusEstoque(item);
      
      switch (status) {
        case 'processado':
          return <Badge className="bg-green-600 text-white">✓ Estoque baixado</Badge>;
        case 'processando':
          return <Badge className="bg-yellow-500 text-white animate-pulse">⏳ Baixando estoque</Badge>;
        case 'sem-estoque':
          return <Badge className="bg-red-600 text-white">⚠️ Sem estoque</Badge>;
        case 'sem-mapeamento':
          return <Badge variant="destructive">📋 Sem mapear</Badge>;
        case 'disponivel':
          return <Badge className="bg-blue-600 text-white">📦 Pronto p/ baixar</Badge>;
        default:
          return <Badge variant="outline">❓ Aguardando</Badge>;
      }
    }
    return <Badge variant="outline">-</Badge>;
  };

  const gerarIdUnico = (item: ItemPedidoEnriquecido) => {
    return `${item.numero_pedido}-${item.sku}`;
  };

  const copiarParaClipboard = (texto: string, tipo: string) => {
    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: `${tipo} copiado para a área de transferência.`,
    });
  };

  const abrirTinyERP = (numeroPedido: string) => {
    // Mock URL - replace with actual Tiny ERP URL pattern
    const url = `https://erp.tiny.com.br/pedido/${numeroPedido}`;
    window.open(url, '_blank');
  };

  const abrirWhatsApp = (cliente: string) => {
    const mensagem = `Olá ${cliente}, gostaria de falar sobre seu pedido.`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  // Função para verificar se item está selecionado
  const isItemSelecionado = (item: ItemPedidoEnriquecido) => {
    return itensSelecionados.some(itemSel => itemSel.id === item.id);
  };

  // Função para alternar seleção de um item
  const toggleSelecaoItem = (item: ItemPedidoEnriquecido) => {
    if (isItemSelecionado(item)) {
      // Remove apenas este item dos selecionados
      onSelecaoChange(itensSelecionados.filter(itemSel => itemSel.id !== item.id));
    } else {
      // Adiciona este item aos já selecionados
      onSelecaoChange([...itensSelecionados, item]);
    }
  };

  // Função para selecionar/deselecionar todos os itens elegíveis
  const toggleSelecaoTodos = () => {
    const itensElegiveis = itens.filter(item => {
      const status = obterStatusEstoque?.(item);
      return status === 'disponivel';
    });
    
    const todosElegiveisEstaoSelecionados = itensElegiveis.every(item => 
      itensSelecionados.some(itemSel => itemSel.id === item.id)
    );
    
    if (todosElegiveisEstaoSelecionados) {
      // Remove apenas os itens elegíveis da seleção, mantendo outros se houver
      const novaSelecao = itensSelecionados.filter(itemSel => 
        !itensElegiveis.some(elegivel => elegivel.id === itemSel.id)
      );
      onSelecaoChange(novaSelecao);
    } else {
      // Adiciona todos os itens elegíveis à seleção atual
      const idsJaSelecionados = itensSelecionados.map(item => item.id);
      const itensParaAdicionar = itensElegiveis.filter(item => 
        !idsJaSelecionados.includes(item.id)
      );
      onSelecaoChange([...itensSelecionados, ...itensParaAdicionar]);
    }
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
                 <TableHead className="px-2">
                   <Checkbox
                     checked={(() => {
                       const itensElegiveis = itens.filter(item => {
                         const status = obterStatusEstoque?.(item);
                         return status === 'disponivel';
                       });
                       return itensElegiveis.length > 0 && itensElegiveis.every(item => 
                         itensSelecionados.some(itemSel => itemSel.id === item.id)
                       );
                     })()}
                     onCheckedChange={toggleSelecaoTodos}
                     aria-label="Selecionar todos os itens elegíveis"
                   />
                 </TableHead>
                <TableHead className="px-2 min-w-[120px]">ID Único</TableHead>
                <TableHead className="px-2 min-w-[100px]">Pedido</TableHead>
                <TableHead className="px-2 min-w-[120px]">Data do Pedido</TableHead>
                <TableHead className="px-2 max-w-[180px]">Cliente</TableHead>
                <TableHead className="px-2 min-w-[120px]">SKU Pedido</TableHead>
                <TableHead className="px-2 max-w-[200px]">Descrição</TableHead>
                <TableHead className="px-2 w-16">Qtd</TableHead>
                <TableHead className="px-2 min-w-[120px]">Valor</TableHead>
                 <TableHead className="px-2 min-w-[100px]">Cidade</TableHead>
                 <TableHead className="px-2 min-w-[60px]">UF</TableHead>
                 <TableHead className="px-2 min-w-[100px]">Situação</TableHead>
                 <TableHead className="px-2 min-w-[140px]">Número da Venda</TableHead>
                 <TableHead className="px-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 min-w-[120px]">
                   <span className="text-blue-900 dark:text-blue-100 font-medium">SKU Estoque</span>
                   <div className="text-xs text-blue-700 dark:text-blue-200">Mapeado</div>
                 </TableHead>
                 <TableHead className="px-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 min-w-[120px]">
                   <span className="text-blue-900 dark:text-blue-100 font-medium">SKU KIT</span>
                   <div className="text-xs text-blue-700 dark:text-blue-200">Mapeado</div>
                 </TableHead>
                 <TableHead className="px-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 w-20">
                   <span className="text-blue-900 dark:text-blue-100 font-medium">QTD KIT</span>
                   <div className="text-xs text-blue-700 dark:text-blue-200">Mapeado</div>
                 </TableHead>
                 <TableHead className="px-2 min-w-[80px]">Tempo</TableHead>
                 <TableHead className="px-2 min-w-[100px]">Prioridade</TableHead>
                 <TableHead className="px-2 min-w-[80px]">Margem</TableHead>
                 <TableHead className="px-2 min-w-[120px]">Status</TableHead>
                 <TableHead className="px-2 min-w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, index) => {
                const prioridade = obterPrioridade(item);
                const margemLucro = calcularMargemLucro(item);
                const statusEstoque = obterStatusEstoque?.(item);
                const isElegivel = statusEstoque === 'disponivel';
                
                return (
                  <TableRow key={`${item.id}-${index}`}>
                    
                    <TableCell className="px-2 w-12">
                      <Checkbox
                        checked={isItemSelecionado(item)}
                        onCheckedChange={() => toggleSelecaoItem(item)}
                        disabled={!isElegivel}
                        aria-label={`Selecionar item ${item.sku}`}
                      />
                    </TableCell>
                    
                    <TableCell className="font-mono text-xs px-2">
                      <div className="min-w-[120px] truncate" title={gerarIdUnico(item)}>
                        {gerarIdUnico(item)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="font-medium px-2">
                      <div className="min-w-[100px] truncate">
                        #{item.numero_pedido}
                      </div>
                    </TableCell>

                    <TableCell className="px-2">
                      <div className="text-sm min-w-[120px]">
                        {formatarData(item.data_pedido)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2">
                      <div className="max-w-[180px] truncate" title={item.nome_cliente}>
                        {item.nome_cliente?.substring(0, 25)}{item.nome_cliente?.length > 25 ? '...' : ''}
                        {item.valor_total > 500 && (
                          <Badge variant="outline" className="ml-1 text-xs">VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className={`px-2 ${item.linha_destacada ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}>
                      <div className="font-mono text-sm min-w-[120px] truncate" title={item.sku}>
                        {item.sku}
                      </div>
                      {item.linha_destacada && (
                        <div className="text-xs text-orange-600 font-medium">
                          ⚠️ Sem mapeamento
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell className="px-2">
                      <div className="max-w-[200px] truncate" title={item.descricao}>
                        {item.descricao?.substring(0, 25)}{item.descricao?.length > 25 ? '...' : ''}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center px-2 w-16">
                      {item.quantidade}
                    </TableCell>
                    
                     <TableCell className="px-2">
                       <div className="text-right min-w-[120px]">
                         <div className="font-semibold">{formatarMoeda(item.valor_unitario * item.quantidade)}</div>
                         <div className="text-xs text-muted-foreground">
                           {formatarMoeda(item.valor_unitario)} un.
                         </div>
                       </div>
                     </TableCell>
                    
                    <TableCell className="px-2">
                      <div className="min-w-[100px] text-sm">
                        {item.cidade || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2">
                      <div className="min-w-[60px] text-sm font-medium">
                        {item.uf || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2">
                      <div className="min-w-[100px]">
                        {getStatusBadge(item.situacao)}
                      </div>
                    </TableCell>

                     <TableCell className="px-2">
                       <div className="font-mono text-xs min-w-[140px] truncate" title={item.numero_ecommerce}>
                         {item.numero_ecommerce || '-'}
                       </div>
                     </TableCell>

                    <TableCell className="px-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="font-mono text-xs text-blue-900 dark:text-blue-100 min-w-[120px] truncate" title={item.mapeamento_aplicado?.sku_correspondente || item.sku_estoque}>
                        {item.mapeamento_aplicado?.sku_correspondente || item.sku_estoque || '-'}
                      </div>
                    </TableCell>

                    <TableCell className="px-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="font-mono text-xs text-blue-900 dark:text-blue-100 min-w-[120px] truncate" title={item.mapeamento_aplicado?.sku_simples}>
                        {item.mapeamento_aplicado?.sku_simples || '-'}
                      </div>
                    </TableCell>

                    <TableCell className="px-2 text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 w-20">
                      <div className="font-medium text-blue-900 dark:text-blue-100">
                        {item.mapeamento_aplicado?.quantidade || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2">
                      <div className={`text-sm ${obterCorTempoDecorrido(item.data_pedido)} min-w-[80px]`}>
                        {calcularTempoDecorrido(item.data_pedido)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatarData(item.data_pedido)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center ${prioridade.cor} min-w-[100px]`}>
                              <prioridade.icon className="h-4 w-4 mr-1" />
                              <span className="text-xs capitalize">{prioridade.nivel}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Valor: {formatarMoeda(item.valor_total)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    
                    <TableCell>
                      <div className={`text-right font-semibold ${
                        margemLucro > 40 ? 'text-green-600' : 
                        margemLucro > 20 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {margemLucro.toFixed(1)}%
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusProcessamentoComEstoque(item)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        
                        {/* Quick Actions */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copiarParaClipboard(item.sku, 'SKU')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar SKU</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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