import { Search, Filter, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const pedidosExample = [
  {
    id: "12847",
    cliente: "Empresa ABC Ltda",
    data: "2024-01-15",
    valor: "R$ 2.450,00",
    status: "processado",
    itens: 5
  },
  {
    id: "12846",
    cliente: "Comércio XYZ",
    data: "2024-01-15",
    valor: "R$ 890,50",
    status: "pendente",
    itens: 3
  },
  {
    id: "12845",
    cliente: "Distribuidora 123",
    data: "2024-01-14",
    valor: "R$ 3.200,00",
    status: "enviado",
    itens: 8
  }
];

export function Pedidos() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground">Integração com Tiny ERP - Gestão completa de pedidos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar
          </Button>
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>
            Busque pedidos por período, cliente, status ou número do pedido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Número do pedido..." className="pl-10" />
            </div>
            <Input placeholder="Cliente..." />
            <Input type="date" />
            <Button variant="default" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            {pedidosExample.length} pedidos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosExample.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">#{pedido.id}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{pedido.data}</TableCell>
                  <TableCell>{pedido.valor}</TableCell>
                  <TableCell>{pedido.itens}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        pedido.status === 'processado' ? 'default' :
                        pedido.status === 'pendente' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {pedido.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Ver</Button>
                      <Button size="sm" variant="secondary">Processar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Integração Tiny ERP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Última sincronização: há 5 minutos</p>
              <p className="text-sm font-medium text-foreground">Conectado e funcionando</p>
            </div>
            <Badge variant="default">Online</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}