import { Package, AlertTriangle, TrendingUp, Plus, Search, Filter, RefreshCw, Image } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEstoque } from "@/hooks/useEstoque";
import { EstoqueFileManager } from "@/components/estoque/EstoqueFileManager";

export function Estoque() {
  const { 
    produtos, 
    metricas, 
    loading, 
    error, 
    filtros, 
    atualizarFiltros, 
    limparFiltros, 
    recarregarDados 
  } = useEstoque();

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusBadge = (produto: any) => {
    if (produto.quantidade_atual === 0) {
      return { variant: 'destructive' as const, texto: 'Crítico' };
    } else if (produto.quantidade_atual <= produto.estoque_minimo) {
      return { variant: 'destructive' as const, texto: 'Baixo' };
    } else {
      return { variant: 'default' as const, texto: 'Normal' };
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={recarregarDados}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
          <p className="text-muted-foreground">Gestão completa de produtos e movimentações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={recarregarDados} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="premium">
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filters and File Management */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Filters */}
        <div className="xl:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription className="text-sm">
                Busque e filtre produtos por nome, SKU ou categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                  <Input
                    placeholder="Buscar por nome ou SKU..."
                    className="pl-9 h-8 text-sm"
                    value={filtros.busca}
                    onChange={(e) => atualizarFiltros({ busca: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Categoria..."
                  className="h-8 text-sm w-32"
                  value={filtros.categoria}
                  onChange={(e) => atualizarFiltros({ categoria: e.target.value })}
                />
                <Input
                  placeholder="Status..."
                  className="h-8 text-sm w-32"
                  value={filtros.status}
                  onChange={(e) => atualizarFiltros({ status: e.target.value })}
                />
                <Button variant="outline" onClick={limparFiltros} className="h-8 text-sm px-3">
                  <Filter className="mr-1 h-3 w-3" />
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Management */}
        <div className="xl:col-span-1">
          <EstoqueFileManager onUploadSuccess={recarregarDados} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{metricas.totalProdutos.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produtos em Alerta
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{metricas.produtosAlerta}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Estoque baixo ou crítico
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total Estoque
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {formatarMoeda(metricas.valorTotalEstoque)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Valor total em estoque
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos em Estoque</CardTitle>
          <CardDescription>
            Controle de quantidades e alertas de estoque baixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
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
          ) : produtos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                {filtros.busca || filtros.categoria || filtros.status 
                  ? "Tente ajustar os filtros ou adicione um novo produto"
                  : "Comece adicionando seus primeiros produtos"}
              </p>
              <Button className="mt-4" variant="premium">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Código de Barras</TableHead>
                  <TableHead className="text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-muted-foreground">Produto</TableHead>
                  <TableHead className="text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-muted-foreground">Qtd Atual</TableHead>
                  <TableHead className="text-muted-foreground">Mínimo</TableHead>
                  <TableHead className="text-muted-foreground">Máximo</TableHead>
                  <TableHead className="text-muted-foreground">Localização</TableHead>
                  <TableHead className="text-muted-foreground">Preço Custo</TableHead>
                  <TableHead className="text-muted-foreground">Preço Venda</TableHead>
                  <TableHead className="text-muted-foreground">Imagem</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => {
                  const statusInfo = getStatusBadge(produto);
                  return (
                    <TableRow key={produto.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-foreground">
                        {produto.codigo_barras || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{produto.sku_interno}</TableCell>
                      <TableCell className="font-medium text-foreground">{produto.nome}</TableCell>
                      <TableCell className="text-foreground">
                        {produto.categoria || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{produto.quantidade_atual}</TableCell>
                      <TableCell className="text-foreground">{produto.estoque_minimo}</TableCell>
                      <TableCell className="text-foreground">{produto.estoque_maximo}</TableCell>
                      <TableCell className="text-foreground">
                        {produto.localizacao || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatarMoeda(produto.preco_custo || 0)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatarMoeda(produto.preco_venda || 0)}
                      </TableCell>
                      <TableCell>
                        {produto.url_imagem ? (
                          <img 
                            src={produto.url_imagem} 
                            alt={produto.nome}
                            className="w-8 h-8 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            <Image className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.texto}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-xs px-2">Editar</Button>
                          <Button size="sm" variant="secondary" className="text-xs px-2">Movimentar</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações Recentes</CardTitle>
          <CardDescription>
            Últimas entradas e saídas de estoque
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-sm font-medium">Entrada - SKU-001234</p>
                <p className="text-xs text-muted-foreground">+50 unidades | há 2 horas</p>
              </div>
              <Badge variant="secondary">Entrada</Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-sm font-medium">Saída - SKU-001235</p>
                <p className="text-xs text-muted-foreground">-25 unidades | há 4 horas</p>
              </div>
              <Badge variant="destructive">Saída</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}