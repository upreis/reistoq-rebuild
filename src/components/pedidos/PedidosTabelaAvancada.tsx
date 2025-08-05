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
  processandoBaixaEstoque?: boolean;
  onBaixarEstoqueLote?: (itens: ItemPedidoEnriquecido[]) => void;
}

export function PedidosTabelaAvancada({
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
  onProcessarPedido,
  obterStatusEstoque,
  processandoBaixaEstoque,
  onBaixarEstoqueLote
}: PedidosTabelaAvancadaProps) {
  
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [statusLoteChange, setStatusLoteChange] = useState("");

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
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

  const toggleSelecionarItem = (itemId: string) => {
    setItensSelecionados(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelecionarTodos = () => {
    if (itensSelecionados.length === itens.length) {
      setItensSelecionados([]);
    } else {
      setItensSelecionados(itens.map(item => item.id));
    }
  };

  const exportarSelecionados = () => {
    const itensSelecionadosData = itens.filter(item => itensSelecionados.includes(item.id));
    
    // Create CSV content
    const headers = ['Pedido', 'Cliente', 'SKU Pedido', 'Descrição', 'Qtd', 'Valor Unit.', 'Total', 'Numero da Venda', 'SKU Estoque', 'SKU KIT', 'QTD KIT', 'Situação', 'Data'];
    const csvContent = [
      headers.join(','),
      ...itensSelecionadosData.map(item => [
        item.numero_pedido,
        `"${item.nome_cliente}"`,
        item.sku,
        `"${item.descricao}"`,
        item.quantidade,
        item.valor_unitario,
        item.valor_total,
        `"${item.numero_ecommerce || ''}"`,
        `"${item.mapeamento_aplicado?.sku_correspondente || item.sku_estoque || ''}"`,
        `"${item.mapeamento_aplicado?.sku_simples || ''}"`,
        item.mapeamento_aplicado?.quantidade || '',
        `"${item.situacao}"`,
        formatarData(item.data_pedido)
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_selecionados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportação concluída",
      description: `${itensSelecionados.length} itens exportados para CSV.`,
    });
  };

  const processarLoteEstoque = () => {
    if (!onBaixarEstoqueLote) return;
    
    const itensSelecionadosData = itens.filter(item => itensSelecionados.includes(item.id));
    const itensElegiveis = itensSelecionadosData.filter(item => {
      const status = obterStatusEstoque?.(item);
      return status === 'disponivel';
    });

    if (itensElegiveis.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum item selecionado está elegível para baixa de estoque.",
        variant: "destructive",
      });
      return;
    }

    onBaixarEstoqueLote(itensElegiveis);
    setItensSelecionados([]);
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
        <div className="flex justify-between items-center">
          <CardTitle>
            Itens de Pedidos ({totalItens} {totalItens === 1 ? 'item' : 'itens'})
          </CardTitle>
          
          {/* Ações em Lote */}
          {itensSelecionados.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="outline" className="mr-2">
                {itensSelecionados.length} selecionado{itensSelecionados.length > 1 ? 's' : ''}
              </Badge>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportarSelecionados}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              
              {onBaixarEstoqueLote && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={processarLoteEstoque}
                  disabled={processandoBaixaEstoque}
                >
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Baixar Estoque
                </Button>
              )}
              
              <Select value={statusLoteChange} onValueChange={setStatusLoteChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Mudar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="faturado">Faturado</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={itensSelecionados.length === itens.length}
                    onCheckedChange={toggleSelecionarTodos}
                  />
                </TableHead>
                <TableHead>ID Único</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>SKU Pedido</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Numero da Venda</TableHead>
                <TableHead>SKU Estoque</TableHead>
                <TableHead>SKU KIT</TableHead>
                <TableHead>QTD KIT</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => {
                const prioridade = obterPrioridade(item);
                const margemLucro = calcularMargemLucro(item);
                
                return (
                  <TableRow key={item.id} className={itensSelecionados.includes(item.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={itensSelecionados.includes(item.id)}
                        onCheckedChange={() => toggleSelecionarItem(item.id)}
                      />
                    </TableCell>
                    
                    <TableCell className="font-mono text-xs">
                      {gerarIdUnico(item)}
                    </TableCell>
                    
                    <TableCell className="font-medium">
                      #{item.numero_pedido}
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-48 truncate">
                        {item.nome_cliente}
                        {item.valor_total > 500 && (
                          <Badge variant="outline" className="ml-1 text-xs">VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className={item.linha_destacada ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}>
                      <div className="font-mono text-sm">{item.sku}</div>
                      {item.linha_destacada && (
                        <div className="text-xs text-orange-600 font-medium">
                          ⚠️ Sem mapeamento
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-60 truncate">
                        {item.descricao}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {item.quantidade}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-right">
                        <div className="font-semibold">{formatarMoeda(item.valor_total)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatarMoeda(item.valor_unitario)} un.
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-xs">
                        {item.numero_ecommerce || '-'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-xs">
                        {item.mapeamento_aplicado?.sku_correspondente || item.sku_estoque || '-'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-xs">
                        {item.mapeamento_aplicado?.sku_simples || '-'}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="font-medium">
                        {item.mapeamento_aplicado?.quantidade || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(item.situacao)}
                    </TableCell>
                    
                    <TableCell>
                      <div className={`text-sm ${obterCorTempoDecorrido(item.data_pedido)}`}>
                        {calcularTempoDecorrido(item.data_pedido)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatarData(item.data_pedido)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center ${prioridade.cor}`}>
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

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => abrirTinyERP(item.numero_pedido)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir no Tiny ERP</TooltipContent>
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
            {itensSelecionados.length > 0 && (
              <span className="ml-2 font-medium">
                • {itensSelecionados.length} selecionado{itensSelecionados.length > 1 ? 's' : ''}
              </span>
            )}
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