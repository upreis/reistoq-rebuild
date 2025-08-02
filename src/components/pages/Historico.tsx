import { History, Filter, Download, Calendar } from "lucide-react";
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

const historicoExample = [
  {
    id: 1,
    timestamp: "2024-01-15 14:30:25",
    usuario: "admin@reistoq.com",
    acao: "Processamento Pedido",
    detalhes: "Pedido #12847 processado com sucesso",
    status: "sucesso"
  },
  {
    id: 2,
    timestamp: "2024-01-15 14:25:10",
    usuario: "operador@reistoq.com", 
    acao: "Upload CSV",
    detalhes: "Arquivo mapeamentos_20240115.csv importado",
    status: "sucesso"
  },
  {
    id: 3,
    timestamp: "2024-01-15 14:20:45",
    usuario: "sistema",
    acao: "Alerta Estoque",
    detalhes: "Produto SKU-001234 com estoque baixo",
    status: "aviso"
  },
  {
    id: 4,
    timestamp: "2024-01-15 14:15:30",
    usuario: "admin@reistoq.com",
    acao: "Configuração API",
    detalhes: "Token Tiny ERP atualizado",
    status: "sucesso"
  }
];

export function Historico() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Operações</h1>
          <p className="text-muted-foreground">Log completo de todas as atividades do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Log
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>
            Filtre o histórico por data, usuário, ação ou status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input type="date" className="pl-10" />
            </div>
            <Input placeholder="Usuário..." />
            <Input placeholder="Ação..." />
            <Input placeholder="Detalhes..." />
            <Button variant="default" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Operações
            </CardTitle>
            <History className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">15,847</div>
            <p className="text-xs text-muted-foreground">
              Operações registradas
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoje
            </CardTitle>
            <Badge className="bg-secondary text-secondary-foreground">247</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">247</div>
            <p className="text-xs text-muted-foreground">
              Operações hoje
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sucessos
            </CardTitle>
            <Badge className="bg-secondary text-secondary-foreground">98%</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">98.2%</div>
            <p className="text-xs text-muted-foreground">
              Taxa de sucesso
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Erros
            </CardTitle>
            <Badge variant="destructive">15</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">15</div>
            <p className="text-xs text-muted-foreground">
              Erros registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Atividades</CardTitle>
          <CardDescription>
            Histórico detalhado de todas as operações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicoExample.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.timestamp}</TableCell>
                  <TableCell>{item.usuario}</TableCell>
                  <TableCell className="font-medium">{item.acao}</TableCell>
                  <TableCell>{item.detalhes}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        item.status === 'sucesso' ? 'default' :
                        item.status === 'aviso' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}