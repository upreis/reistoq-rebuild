import { ScanLine, Camera, Search, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function Scanner() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scanner de Código de Barras</h1>
          <p className="text-muted-foreground">Leitura rápida de códigos para consulta de produtos</p>
        </div>
      </div>

      {/* Scanner Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner de Câmera
            </CardTitle>
            <CardDescription>
              Use a câmera do dispositivo para ler códigos de barras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <div className="text-center">
                <ScanLine className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Camera desativada</p>
                <Button variant="premium">
                  <Camera className="mr-2 h-4 w-4" />
                  Ativar Câmera
                </Button>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-accent-light rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Como usar:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Posicione o código de barras no centro da tela</li>
                <li>• Mantenha o dispositivo estável</li>
                <li>• Aguarde a leitura automática</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Manual Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Busca Manual
            </CardTitle>
            <CardDescription>
              Digite o código manualmente para buscar o produto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Código de Barras</label>
              <Input 
                placeholder="Digite ou cole o código aqui..."
                className="text-center font-mono"
              />
            </div>
            
            <Button className="w-full" variant="secondary">
              <Search className="mr-2 h-4 w-4" />
              Buscar Produto
            </Button>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-muted-foreground mb-2">Último código lido:</h4>
              <p className="font-mono text-foreground bg-muted p-2 rounded">
                7891234567890
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Lido há 2 minutos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resultado da Busca
          </CardTitle>
          <CardDescription>
            Informações do produto encontrado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">Produto Exemplo</h3>
                <p className="text-muted-foreground">SKU: SKU-001234</p>
              </div>
              <Badge variant="default">Em Estoque</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Quantidade Atual</p>
                <p className="text-xl font-bold text-foreground">120 unidades</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                <p className="text-xl font-bold text-foreground">30 unidades</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Movimentação</p>
                <p className="text-xl font-bold text-foreground">há 2 dias</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary">Ver Detalhes</Button>
              <Button variant="outline">Movimentar Estoque</Button>
              <Button variant="outline">Histórico</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Códigos Lidos Recentemente</CardTitle>
          <CardDescription>
            Histórico dos últimos códigos escaneados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { codigo: "7891234567890", produto: "Produto A", timestamp: "há 5 min" },
              { codigo: "7891234567891", produto: "Produto B", timestamp: "há 12 min" },
              { codigo: "7891234567892", produto: "Produto C", timestamp: "há 1 hora" }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-mono text-sm text-foreground">{item.codigo}</p>
                  <p className="text-sm text-muted-foreground">{item.produto}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                  <Button size="sm" variant="ghost">Consultar</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}