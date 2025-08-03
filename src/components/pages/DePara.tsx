import { Upload, FileText, Search, Check, X, Download, Filter } from "lucide-react";
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

const mapeamentosExample = [
  {
    id: 1,
    sku_pedido: "PROD-001-A",
    sku_correspondente: "SKU-001234",
    sku_simples: "SIMPLE-001",
    quantidade: 2,
    ativo: true,
    observacoes: "Produto com variação de cor"
  },
  {
    id: 2,
    sku_pedido: "PROD-002-B",
    sku_correspondente: "SKU-001235",
    sku_simples: "SIMPLE-002",
    quantidade: 1,
    ativo: true,
    observacoes: ""
  },
  {
    id: 3,
    sku_pedido: "PROD-003-C",
    sku_correspondente: "SKU-001236",
    sku_simples: "SIMPLE-003",
    quantidade: 3,
    ativo: false,
    observacoes: "Descontinuado"
  }
];

export function DePara() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mapeamento DE/PARA</h1>
          <p className="text-muted-foreground">Correspondência entre SKUs do pedido e SKUs internos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="premium">
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload de Arquivo CSV
          </CardTitle>
          <CardDescription>
            Faça upload de um arquivo CSV contendo os mapeamentos DE/PARA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Arraste e solte seu arquivo CSV aqui ou clique para selecionar
              </p>
              <Button variant="secondary">
                Selecionar Arquivo
              </Button>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-accent-light rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Formato do CSV:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              O arquivo deve conter as colunas: sku_pedido, sku_correspondente, sku_simples, quantidade, observacoes
            </p>
            <Button variant="ghost" size="sm">
              <Download className="mr-2 h-3 w-3" />
              Baixar modelo CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>
            Busque mapeamentos por SKU, status ou observações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="SKU do pedido..." className="pl-10" />
            </div>
            <Input placeholder="SKU correspondente..." />
            <Input placeholder="SKU simples..." />
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
              Total de Mapeamentos
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1,247</div>
            <p className="text-xs text-muted-foreground">
              Mapeamentos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativos
            </CardTitle>
            <Check className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1,198</div>
            <p className="text-xs text-muted-foreground">
              96% dos mapeamentos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inativos
            </CardTitle>
            <X className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">49</div>
            <p className="text-xs text-muted-foreground">
              4% dos mapeamentos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Último Upload
            </CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">há 2h</div>
            <p className="text-xs text-muted-foreground">
              mapeamentos_20240115.csv
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mapeamentos DE/PARA</CardTitle>
          <CardDescription>
            Lista completa de correspondências entre SKUs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Pedido</TableHead>
                <TableHead>SKU Correspondente</TableHead>
                <TableHead>SKU Simples</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapeamentosExample.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku_pedido}</TableCell>
                  <TableCell>{item.sku_correspondente}</TableCell>
                  <TableCell>{item.sku_simples}</TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? 'default' : 'destructive'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.observacoes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Editar</Button>
                      <Button 
                        size="sm" 
                        variant={item.ativo ? "destructive" : "secondary"}
                      >
                        {item.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Operações Recentes</CardTitle>
          <CardDescription>
            Últimas operações de importação e modificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-sm font-medium">Upload CSV - mapeamentos_20240115.csv</p>
                <p className="text-xs text-muted-foreground">247 mapeamentos importados | há 2 horas</p>
              </div>
              <Badge variant="default">Sucesso</Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-sm font-medium">Edição manual - PROD-001-A</p>
                <p className="text-xs text-muted-foreground">Quantidade alterada de 1 para 2 | há 4 horas</p>
              </div>
              <Badge variant="secondary">Manual</Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-sm font-medium">Desativação - PROD-003-C</p>
                <p className="text-xs text-muted-foreground">Mapeamento desativado por descontinuação | há 1 dia</p>
              </div>
              <Badge variant="destructive">Desativado</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}