import React, { useMemo, useCallback } from "react";
import { Package, Edit, ArrowUpDown, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Produto } from "@/hooks/useEstoque";
import { ProdutoImageUpload } from "./ProdutoImageUpload";
import { PermissionGate } from "@/components/auth/PermissionGate";

interface EstoqueTabelaProps {
  produtos: Produto[];
  loading: boolean;
  produtosSelecionados: string[];
  todosSeleccionados: boolean;
  paginaAtual: number;
  totalPaginas: number;
  itemInicial: number;
  itemFinal: number;
  totalItens: number;
  onSelecionarProduto: (produtoId: string) => void;
  onSelecionarTodos: () => void;
  onAbrirDetalhes: (produto: Produto) => void;
  onAbrirEdicao: (produto: Produto) => void;
  onMovimentar: (produto: Produto) => void;
  onImageUploaded: () => void;
  onPaginar: (pagina: number) => void;
  onPaginaAnterior: () => void;
  onProximaPagina: () => void;
  onAbrirPrevisao?: (produto: Produto) => void;
}

export function EstoqueTabela({
  produtos,
  loading,
  produtosSelecionados,
  todosSeleccionados,
  paginaAtual,
  totalPaginas,
  itemInicial,
  itemFinal,
  totalItens,
  onSelecionarProduto,
  onSelecionarTodos,
  onAbrirDetalhes,
  onAbrirEdicao,
  onMovimentar,
  onImageUploaded,
  onPaginar,
  onPaginaAnterior,
  onProximaPagina,
  onAbrirPrevisao
}: EstoqueTabelaProps) {
  // Memoizar funções para evitar re-renders
  const formatarMoeda = useCallback((valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }, []);

  const getStatusBadge = useCallback((produto: Produto) => {
    if (!produto.ativo) {
      return { variant: 'secondary' as const, texto: 'Inativo' };
    } else if (produto.quantidade_atual === 0) {
      return { variant: 'destructive' as const, texto: 'Crítico' };
    } else if (produto.quantidade_atual <= produto.estoque_minimo) {
      return { variant: 'destructive' as const, texto: 'Baixo' };
    } else if (produto.quantidade_atual > produto.estoque_maximo) {
      return { variant: 'outline' as const, texto: 'Alto' };
    } else {
      return { variant: 'default' as const, texto: 'Ativo' };
    }
  }, []);

  // Memoizar skeleton loading
  const skeletonLoading = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Produtos em Estoque</CardTitle>
        <CardDescription>Carregando produtos...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ), []);

  // Memoizar estado vazio
  const emptyState = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Produtos em Estoque</CardTitle>
        <CardDescription>Nenhum produto encontrado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Tente ajustar os filtros ou adicione um novo produto
          </p>
        </div>
      </CardContent>
    </Card>
  ), []);

  if (loading) {
    return skeletonLoading;
  }

  if (produtos.length === 0) {
    return emptyState;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos em Estoque</CardTitle>
        <CardDescription>
          Controle de quantidades e alertas de estoque baixo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="w-full">
            {/* Informações da paginação */}
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>
                Mostrando {itemInicial} a {itemFinal} de {totalItens} produtos
              </span>
            </div>
      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground w-12">
              <Checkbox
                checked={todosSeleccionados}
                onCheckedChange={onSelecionarTodos}
              />
            </TableHead>
            <TableHead className="text-muted-foreground min-w-[140px]">
              <Button variant="ghost" className="h-auto p-0 font-medium">
                Código de Barras
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground min-w-[120px]">
              <Button variant="ghost" className="h-auto p-0 font-medium">
                SKU
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground min-w-[180px]">
              <Button variant="ghost" className="h-auto p-0 font-medium">
                Produto
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground min-w-[120px]">Categoria</TableHead>
            <TableHead className="text-muted-foreground w-20">
              <Button variant="ghost" className="h-auto p-0 font-medium">
                Qtd Atual
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground w-20">Mínimo</TableHead>
            <TableHead className="text-muted-foreground w-20">Máximo</TableHead>
            <TableHead className="text-muted-foreground min-w-[100px]">Localização</TableHead>
            <TableHead className="text-muted-foreground min-w-[100px]">Preço Custo</TableHead>
            <TableHead className="text-muted-foreground min-w-[100px]">Preço Venda</TableHead>
            <TableHead className="text-muted-foreground w-20">Imagem</TableHead>
            <TableHead className="text-muted-foreground w-20">Status</TableHead>
            <TableHead className="text-muted-foreground min-w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
              <TableBody>
                {produtos.map((produto) => {
                  const statusInfo = getStatusBadge(produto);
                  return (
                    <TableRow 
                      key={produto.id} 
                      className="border-border hover:bg-muted/50 cursor-pointer"
                      onClick={() => onAbrirDetalhes(produto)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={produtosSelecionados.includes(produto.id)}
                          onCheckedChange={() => onSelecionarProduto(produto.id)}
                        />
                      </TableCell>
                      <TableCell className="text-foreground min-w-[140px] truncate" title={produto.codigo_barras}>
                        {produto.codigo_barras || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="font-medium text-foreground min-w-[120px] truncate" title={produto.sku_interno}>
                        {produto.sku_interno}
                      </TableCell>
                      <TableCell className="font-medium text-foreground min-w-[180px] truncate" title={produto.nome}>
                        {produto.nome}
                      </TableCell>
                      <TableCell className="text-foreground min-w-[120px] truncate" title={produto.categoria}>
                        {produto.categoria || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-foreground font-medium text-center w-20">{produto.quantidade_atual}</TableCell>
                      <TableCell className="text-foreground text-center w-20">{produto.estoque_minimo}</TableCell>
                      <TableCell className="text-foreground text-center w-20">{produto.estoque_maximo}</TableCell>
                      <TableCell className="text-foreground min-w-[100px] truncate" title={produto.localizacao}>
                        {produto.localizacao || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-foreground min-w-[100px]">
                        {formatarMoeda(produto.preco_custo || 0)}
                      </TableCell>
                      <TableCell className="text-foreground min-w-[100px]">
                        {formatarMoeda(produto.preco_venda || 0)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="w-20">
                        <PermissionGate required="estoque:edit">
                          <ProdutoImageUpload
                            produtoId={produto.id}
                            currentImageUrl={produto.url_imagem}
                            onImageUploaded={onImageUploaded}
                          />
                        </PermissionGate>
                      </TableCell>
                      <TableCell className="w-20">
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.texto}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="min-w-[120px]">
                        <div className="flex gap-1">
                          <PermissionGate required="estoque:edit">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs px-2"
                              onClick={() => onAbrirEdicao(produto)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate required="estoque:edit">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="text-xs px-2"
                              onClick={() => onMovimentar(produto)}
                            >
                              Movimentar
                            </Button>
                          </PermissionGate>
                          {onAbrirPrevisao && (
                            <Button 
                              size="sm" 
                              variant="premium" 
                              className="text-xs px-2"
                              onClick={() => onAbrirPrevisao(produto)}
                              title="Previsão IA"
                            >
                              <Brain className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {paginaAtual} de {totalPaginas}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={onPaginaAnterior}
                        className={paginaAtual <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                            onClick={() => onPaginar(pageNumber)}
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
                        className={paginaAtual >= totalPaginas ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Envolver o componente com React.memo para evitar re-renders desnecessários
export default React.memo(EstoqueTabela);