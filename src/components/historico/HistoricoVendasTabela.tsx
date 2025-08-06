import { useState, useEffect } from "react";
import { Edit, Trash2, Settings } from "lucide-react";
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
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { formatarMoeda, formatarData } from "@/lib/utils";

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  descricao: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_pedido: string;
  created_at: string;
  updated_at: string;
  ncm: string | null;
  codigo_barras: string | null;
  pedido_id: string | null;
  cpf_cnpj: string | null;
  valor_frete: number | null;
  data_prevista: string | null;
  obs: string | null;
  obs_interna: string | null;
  cidade: string | null;
  uf: string | null;
  url_rastreamento: string | null;
  situacao: string | null;
  codigo_rastreamento: string | null;
  numero_ecommerce: string | null;
  valor_desconto: number | null;
  numero_venda: string | null;
  sku_estoque: string | null;
  sku_kit: string | null;
  qtd_kit: number | null;
}

interface HistoricoVendasTabelaProps {
  vendas: HistoricoVenda[];
  vendasSelecionadas: string[];
  onSelecaoChange: (vendas: string[]) => void;
  loading: boolean;
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itemInicial: number;
  itemFinal: number;
  onPaginaChange: (pagina: number) => void;
  onProximaPagina: () => void;
  onPaginaAnterior: () => void;
  onEditarVenda: (venda: HistoricoVenda) => void;
  onExcluirVenda: (id: string) => void;
}

export function HistoricoVendasTabela({
  vendas,
  vendasSelecionadas,
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
  onEditarVenda,
  onExcluirVenda,
}: HistoricoVendasTabelaProps) {
  const [colunasVisiveis, setColunasVisiveis] = useState(() => {
    const saved = localStorage.getItem('historico-vendas-colunas-visiveis');
    return saved ? JSON.parse(saved) : {
      idUnico: true,
      pedido: true,
      dataPedido: true,
      cliente: true,
      skuPedido: true,
      descricao: true,
      qtd: true,
      valor: true,
      cidade: true,
      uf: true,
      situacao: true,
      numeroVenda: false,
      skuEstoque: false,
      skuKit: false,
      qtdKit: false,
    };
  });

  useEffect(() => {
    localStorage.setItem('historico-vendas-colunas-visiveis', JSON.stringify(colunasVisiveis));
  }, [colunasVisiveis]);

  const getSituacaoBadge = (situacao: string | null) => {
    if (!situacao) {
      return <Badge variant="outline">-</Badge>;
    }
    
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

  const isVendaSelecionada = (vendaId: string) => {
    return vendasSelecionadas.includes(vendaId);
  };

  const toggleSelecaoVenda = (vendaId: string) => {
    if (isVendaSelecionada(vendaId)) {
      onSelecaoChange(vendasSelecionadas.filter(id => id !== vendaId));
    } else {
      onSelecaoChange([...vendasSelecionadas, vendaId]);
    }
  };

  const toggleSelecaoTodas = () => {
    if (vendasSelecionadas.length === vendas.length) {
      onSelecaoChange([]);
    } else {
      onSelecaoChange(vendas.map(venda => venda.id));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando histórico...</CardTitle>
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

  if (vendas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma venda encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não há vendas que correspondam aos filtros aplicados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Histórico de Vendas ({totalItens} {totalItens === 1 ? 'venda' : 'vendas'})
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, idUnico: !prev.idUnico }))}>
              <Checkbox checked={colunasVisiveis.idUnico} className="mr-2" />
              ID Único
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, pedido: !prev.pedido }))}>
              <Checkbox checked={colunasVisiveis.pedido} className="mr-2" />
              Pedido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, dataPedido: !prev.dataPedido }))}>
              <Checkbox checked={colunasVisiveis.dataPedido} className="mr-2" />
              Data do Pedido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, cliente: !prev.cliente }))}>
              <Checkbox checked={colunasVisiveis.cliente} className="mr-2" />
              Cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, skuPedido: !prev.skuPedido }))}>
              <Checkbox checked={colunasVisiveis.skuPedido} className="mr-2" />
              SKU Pedido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, descricao: !prev.descricao }))}>
              <Checkbox checked={colunasVisiveis.descricao} className="mr-2" />
              Descrição
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, qtd: !prev.qtd }))}>
              <Checkbox checked={colunasVisiveis.qtd} className="mr-2" />
              Qtd
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, valor: !prev.valor }))}>
              <Checkbox checked={colunasVisiveis.valor} className="mr-2" />
              Valor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, cidade: !prev.cidade }))}>
              <Checkbox checked={colunasVisiveis.cidade} className="mr-2" />
              Cidade
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, uf: !prev.uf }))}>
              <Checkbox checked={colunasVisiveis.uf} className="mr-2" />
              UF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, situacao: !prev.situacao }))}>
              <Checkbox checked={colunasVisiveis.situacao} className="mr-2" />
              Situação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, numeroVenda: !prev.numeroVenda }))}>
              <Checkbox checked={colunasVisiveis.numeroVenda} className="mr-2" />
              Número da Venda
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, skuEstoque: !prev.skuEstoque }))}>
              <Checkbox checked={colunasVisiveis.skuEstoque} className="mr-2" />
              SKU Estoque
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, skuKit: !prev.skuKit }))}>
              <Checkbox checked={colunasVisiveis.skuKit} className="mr-2" />
              SKU KIT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, qtdKit: !prev.qtdKit }))}>
              <Checkbox checked={colunasVisiveis.qtdKit} className="mr-2" />
              QTD KIT
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={vendasSelecionadas.length === vendas.length}
                    onCheckedChange={toggleSelecaoTodas}
                  />
                </TableHead>
                {colunasVisiveis.idUnico && <TableHead>ID Único</TableHead>}
                {colunasVisiveis.pedido && <TableHead>Pedido</TableHead>}
                {colunasVisiveis.dataPedido && <TableHead>Data do Pedido</TableHead>}
                {colunasVisiveis.cliente && <TableHead>Cliente</TableHead>}
                {colunasVisiveis.skuPedido && <TableHead>SKU Pedido</TableHead>}
                {colunasVisiveis.descricao && <TableHead>Descrição</TableHead>}
                {colunasVisiveis.qtd && <TableHead>Qtd</TableHead>}
                {colunasVisiveis.valor && <TableHead>Valor</TableHead>}
                {colunasVisiveis.cidade && <TableHead>Cidade</TableHead>}
                {colunasVisiveis.uf && <TableHead>UF</TableHead>}
                {colunasVisiveis.situacao && <TableHead>Situação</TableHead>}
                {colunasVisiveis.numeroVenda && <TableHead>Número da Venda</TableHead>}
                {colunasVisiveis.skuEstoque && <TableHead>SKU Estoque</TableHead>}
                {colunasVisiveis.skuKit && <TableHead>SKU KIT</TableHead>}
                {colunasVisiveis.qtdKit && <TableHead>QTD KIT</TableHead>}
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell>
                    <Checkbox 
                      checked={isVendaSelecionada(venda.id)}
                      onCheckedChange={() => toggleSelecaoVenda(venda.id)}
                    />
                  </TableCell>
                  {colunasVisiveis.idUnico && (
                    <TableCell className="font-mono text-sm">
                      {venda.id_unico || '-'}
                    </TableCell>
                  )}
                  {colunasVisiveis.pedido && (
                    <TableCell className="font-mono text-sm">
                      {venda.numero_pedido}
                    </TableCell>
                  )}
                  {colunasVisiveis.dataPedido && (
                    <TableCell>
                      {formatarData(venda.data_pedido)}
                    </TableCell>
                  )}
                  {colunasVisiveis.cliente && (
                    <TableCell className="max-w-[200px] truncate">
                      {venda.cliente_nome || '-'}
                    </TableCell>
                  )}
                  {colunasVisiveis.skuPedido && (
                    <TableCell className="font-mono text-sm">
                      {venda.sku_produto}
                    </TableCell>
                  )}
                  {colunasVisiveis.descricao && (
                    <TableCell className="max-w-[300px] truncate">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{venda.descricao || '-'}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{venda.descricao || 'Sem descrição'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                  {colunasVisiveis.qtd && (
                    <TableCell className="text-center">
                      {venda.quantidade}
                    </TableCell>
                  )}
                  {colunasVisiveis.valor && (
                    <TableCell className="text-right font-mono">
                      {formatarMoeda(venda.valor_total)}
                    </TableCell>
                  )}
                  {colunasVisiveis.cidade && (
                    <TableCell>
                      {venda.cidade || '-'}
                    </TableCell>
                  )}
                  {colunasVisiveis.uf && (
                    <TableCell className="text-center">
                      {venda.uf || '-'}
                    </TableCell>
                  )}
                  {colunasVisiveis.situacao && (
                    <TableCell>
                      {getSituacaoBadge(venda.situacao)}
                    </TableCell>
                  )}
                  {colunasVisiveis.numeroVenda && (
                    <TableCell className="font-mono text-sm">
                      {venda.numero_venda || '-'}
                    </TableCell>
                  )}
                  {colunasVisiveis.skuEstoque && (
                    <TableCell className="font-mono text-sm">
                      {venda.sku_estoque || '-'}
                    </TableCell>
                  )}
                  {colunasVisiveis.skuKit && (
                    <TableCell className="font-mono text-sm">
                      {venda.sku_kit || '-'}
                    </TableCell>
                  )}
                  {colunasVisiveis.qtdKit && (
                    <TableCell className="text-center">
                      {venda.qtd_kit || '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditarVenda(venda)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar venda</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onExcluirVenda(venda.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir venda</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {itemInicial} até {itemFinal} de {totalItens} vendas
            </div>
            <Pagination>
              <PaginationContent>
                {paginaAtual > 1 && (
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={onPaginaAnterior}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
                
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  const pageNumber = Math.max(1, Math.min(totalPaginas - 4, paginaAtual - 2)) + i;
                  if (pageNumber <= totalPaginas) {
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
                  }
                  return null;
                })}

                {paginaAtual < totalPaginas && (
                  <PaginationItem>
                    <PaginationNext 
                      onClick={onProximaPagina}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}