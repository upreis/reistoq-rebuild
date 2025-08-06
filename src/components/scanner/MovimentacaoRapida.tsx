import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Minus, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface MovimentacaoRapidaProps {
  produto: {
    id: string;
    nome: string;
    sku_interno: string;
    quantidade_atual: number;
    estoque_minimo: number;
    url_imagem?: string;
  };
  onMovimentacao: () => void;
}

export const MovimentacaoRapida: React.FC<MovimentacaoRapidaProps> = ({
  produto,
  onMovimentacao
}) => {
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleMovimentacao = async (tipo: 'entrada' | 'saida') => {
    if (quantidade <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    if (tipo === 'saida' && quantidade > produto.quantidade_atual) {
      toast({
        title: "Estoque insuficiente",
        description: "Não há estoque suficiente para esta operação",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const novaQuantidade = tipo === 'entrada' 
        ? produto.quantidade_atual + quantidade 
        : produto.quantidade_atual - quantidade;

      // Atualizar produto
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ 
          quantidade_atual: novaQuantidade,
          ultima_movimentacao: new Date().toISOString()
        })
        .eq('id', produto.id);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          produto_id: produto.id,
          tipo_movimentacao: tipo,
          quantidade_anterior: produto.quantidade_atual,
          quantidade_nova: novaQuantidade,
          quantidade_movimentada: quantidade,
          motivo: motivo || `${tipo === 'entrada' ? 'Entrada' : 'Saída'} via scanner`,
          observacoes: `Movimentação realizada via scanner - SKU: ${produto.sku_interno}`
        });

      if (movError) throw movError;

      toast({
        title: "Movimentação realizada",
        description: `${tipo === 'entrada' ? 'Entrada de' : 'Saída de'} ${quantidade} unidades registrada`,
      });

      // Limpar campos
      setQuantidade(1);
      setMotivo('');
      
      // Notificar componente pai
      onMovimentacao();

    } catch (error) {
      console.error('Erro na movimentação:', error);
      toast({
        title: "Erro na movimentação",
        description: "Não foi possível realizar a movimentação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const estoqueStatus = produto.quantidade_atual <= produto.estoque_minimo ? 'baixo' : 'normal';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Movimentação Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Produto Info */}
        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
          {produto.url_imagem && (
            <img 
              src={produto.url_imagem} 
              alt={produto.nome}
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <h4 className="font-medium text-foreground">{produto.nome}</h4>
            <p className="text-sm text-muted-foreground">SKU: {produto.sku_interno}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium">Estoque:</span>
              <Badge variant={estoqueStatus === 'baixo' ? 'destructive' : 'default'}>
                {produto.quantidade_atual} unidades
              </Badge>
              {estoqueStatus === 'baixo' && (
                <Badge variant="outline" className="text-xs">
                  Baixo estoque
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Movimentação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              placeholder="Ex: 10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Input
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Recebimento, Venda, Ajuste"
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleMovimentacao('entrada')}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {loading ? 'Processando...' : 'Dar Entrada'}
          </Button>

          <Button
            onClick={() => handleMovimentacao('saida')}
            disabled={loading || quantidade > produto.quantidade_atual}
            className="w-full"
            variant="outline"
          >
            <TrendingDown className="mr-2 h-4 w-4" />
            {loading ? 'Processando...' : 'Dar Saída'}
          </Button>
        </div>

        {quantidade > produto.quantidade_atual && (
          <div className="text-sm text-destructive text-center">
            ⚠️ Quantidade indisponível no estoque
          </div>
        )}
      </CardContent>
    </Card>
  );
};