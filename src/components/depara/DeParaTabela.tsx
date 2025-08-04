import { ArrowLeftRight, Edit, ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { MapeamentoDePara } from "@/hooks/useDePara";

interface DeParaTabelaProps {
  mapeamentos: MapeamentoDePara[];
  loading: boolean;
  mapeamentosSelecionados: string[];
  todosSeleccionados: boolean;
  paginaAtual: number;
  totalPaginas: number;
  itemInicial: number;
  itemFinal: number;
  totalItens: number;
  onSelecionarMapeamento: (mapeamentoId: string) => void;
  onSelecionarTodos: () => void;
  onAbrirEdicao: (mapeamento: MapeamentoDePara) => void;
  onExcluirMapeamento: (id: string) => void;
  
  onPaginar: (pagina: number) => void;
  onPaginaAnterior: () => void;
  onProximaPagina: () => void;
}

export function DeParaTabela({
  mapeamentos,
  loading,
  mapeamentosSelecionados,
  todosSeleccionados,
  paginaAtual,
  totalPaginas,
  itemInicial,
  itemFinal,
  totalItens,
  onSelecionarMapeamento,
  onSelecionarTodos,
  onAbrirEdicao,
  onExcluirMapeamento,
  
  onPaginar,
  onPaginaAnterior,
  onProximaPagina
}: DeParaTabelaProps) {

  if (loading) {
    return (
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
    );
  }

  if (mapeamentos.length === 0) {
    return (
      <div className="text-center py-12">
        <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum mapeamento encontrado</h3>
        <p className="text-muted-foreground mb-4">
          Tente ajustar os filtros ou adicione um novo mapeamento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informações da paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Mostrando {itemInicial} a {itemFinal} de {totalItens} mapeamentos
        </span>
      </div>

      {/* Tabela */}
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground w-12">
              <Checkbox
                checked={todosSeleccionados}
                onCheckedChange={onSelecionarTodos}
              />
            </TableHead>
            <TableHead className="text-muted-foreground">
              <Button variant="ghost" className="h-auto p-0 font-medium">
                SKU Do Pedido
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground">
              <Button variant="ghost" className="h-auto p-0 font-medium">
                SKU Correto Do Pedido
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground">SKU Unitário</TableHead>
            <TableHead className="text-muted-foreground">
              <Button variant="ghost" className="h-auto p-0 font-medium">
                Quantidade Do Kit
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            
            <TableHead className="text-muted-foreground">Observações</TableHead>
            <TableHead className="text-muted-foreground">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mapeamentos.map((mapeamento) => (
            <TableRow 
              key={mapeamento.id} 
              className="border-border hover:bg-muted/50"
            >
              <TableCell>
                <Checkbox
                  checked={mapeamentosSelecionados.includes(mapeamento.id)}
                  onCheckedChange={() => onSelecionarMapeamento(mapeamento.id)}
                />
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {mapeamento.sku_pedido}
              </TableCell>
              <TableCell className="text-foreground">
                {mapeamento.sku_correspondente}
              </TableCell>
              <TableCell className="text-foreground">
                {mapeamento.sku_simples || <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell className="text-foreground font-medium">
                {mapeamento.quantidade}
              </TableCell>
              <TableCell className="text-foreground max-w-48 truncate" title={mapeamento.observacoes || ""}>
                {mapeamento.observacoes || <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2"
                    onClick={() => onAbrirEdicao(mapeamento)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="text-xs px-2"
                    onClick={() => onExcluirMapeamento(mapeamento.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
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
  );
}