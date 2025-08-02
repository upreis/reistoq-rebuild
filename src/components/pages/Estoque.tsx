import { Package, AlertTriangle, TrendingUp, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const estoqueExample = [
  {
    sku: "SKU-001234",
    produto: "Produto A - Variação 1",
    atual: 45,
    minimo: 50,
    maximo: 200,
    status: "baixo"
  },
  {
    sku: "SKU-001235", 
    produto: "Produto B - Variação 2",
    atual: 120,
    minimo: 30,
    maximo: 150,
    status: "normal"
  },
  {
    sku: "SKU-001236",
    produto: "Produto C - Variação 3", 
    atual: 0,
    minimo: 20,
    maximo: 100,
    status: "critico"
  }
];

export function Estoque() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
          <p className="text-muted-foreground">Gestão completa de produtos e movimentações</p>
        </div>
        <Button variant="premium">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
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
            <div className="text-2xl font-bold text-foreground">8,562</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +3% vs. mês anterior
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
            <div className="text-2xl font-bold text-foreground">23</div>
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
            <div className="text-2xl font-bold text-foreground">R$ 2.4M</div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Atual</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Máximo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estoqueExample.map((item) => (
                <TableRow key={item.sku}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.produto}</TableCell>
                  <TableCell>{item.atual}</TableCell>
                  <TableCell>{item.minimo}</TableCell>
                  <TableCell>{item.maximo}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        item.status === 'critico' ? 'destructive' :
                        item.status === 'baixo' ? 'destructive' :
                        'default'
                      }
                    >
                      {item.status === 'critico' ? 'Crítico' :
                       item.status === 'baixo' ? 'Baixo' : 'Normal'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Editar</Button>
                      <Button size="sm" variant="secondary">Movimentar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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