import { Upload, Download, ArrowLeftRight, FileSpreadsheet } from "lucide-react";
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

const mapeamentosExample = [
  {
    id: 1,
    skuPedido: "PROD-001-A",
    skuEstoque: "SKU-001234",
    status: "ativo",
    dataMapping: "2024-01-15"
  },
  {
    id: 2,
    skuPedido: "PROD-002-B",
    skuEstoque: "SKU-001235", 
    status: "ativo",
    dataMapping: "2024-01-14"
  },
  {
    id: 3,
    skuPedido: "PROD-003-C",
    skuEstoque: "Não mapeado",
    status: "pendente",
    dataMapping: "2024-01-13"
  }
];

export function DePara() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mapeamento DE/PARA</h1>
          <p className="text-muted-foreground">Gestão de mapeamento SKU Pedido → SKU Estoque</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="premium">
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Mapeamentos
            </CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1,247</div>
            <p className="text-xs text-muted-foreground">
              Mapeamentos ativos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">23</div>
            <p className="text-xs text-muted-foreground">
              Aguardando mapeamento
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
            <Badge className="bg-secondary text-secondary-foreground">98%</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">98.2%</div>
            <p className="text-xs text-muted-foreground">
              Mapeamentos válidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivo CSV</CardTitle>
          <CardDescription>
            Faça upload do arquivo CSV com os mapeamentos SKU para processamento automático
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Arraste o arquivo CSV aqui
            </h3>
            <p className="text-muted-foreground mb-4">
              ou clique para selecionar um arquivo
            </p>
            <Button variant="premium">
              Selecionar Arquivo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mapeamentos Existentes</CardTitle>
          <CardDescription>
            Visualize e edite os mapeamentos atuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Pedido</TableHead>
                <TableHead>SKU Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Mapping</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapeamentosExample.map((mapeamento) => (
                <TableRow key={mapeamento.id}>
                  <TableCell className="font-medium">{mapeamento.skuPedido}</TableCell>
                  <TableCell>{mapeamento.skuEstoque}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={mapeamento.status === 'ativo' ? 'default' : 'destructive'}
                    >
                      {mapeamento.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{mapeamento.dataMapping}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Editar</Button>
                      <Button size="sm" variant="secondary">Validar</Button>
                    </div>
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