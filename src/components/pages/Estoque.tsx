import { Package, AlertTriangle, TrendingUp, Plus, Search, Filter, RefreshCw, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEstoque } from "@/hooks/useEstoque";
import { useEstoquePaginado } from "@/hooks/useEstoquePaginado";
import { useRelatorios } from "@/hooks/useRelatorios";
import { EstoqueFileManager } from "@/components/estoque/EstoqueFileManager";
import { ProdutoDetalhesModal } from "@/components/estoque/ProdutoDetalhesModal";
import { ProdutoEditModal } from "@/components/estoque/ProdutoEditModal";
import { ProdutoImageUpload } from "@/components/estoque/ProdutoImageUpload";
import { EstoqueHeader } from "@/components/estoque/EstoqueHeader";
import { EstoqueFiltros } from "@/components/estoque/EstoqueFiltros";
import { EstoqueBarraStatus } from "@/components/estoque/EstoqueBarraStatus";
import EstoqueTabela from "@/components/estoque/EstoqueTabela";
import { MovimentacaoModal } from "@/components/estoque/MovimentacaoModal";
import { NovoProdutoModal } from "@/components/estoque/NovoProdutoModal";
import { EstoqueHistoricoMovimentacoes } from "@/components/estoque/EstoqueHistoricoMovimentacoes";
import { PrevisaoReposicaoModal } from "@/components/estoque/PrevisaoReposicaoModal";
import { RetornoEstoqueModal } from "@/components/estoque/RetornoEstoqueModal";
import { EstoqueSyncConfig } from "@/components/estoque/EstoqueSyncConfig";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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

  const {
    produtosPaginados,
    paginaAtual,
    totalPaginas,
    itemInicial,
    itemFinal,
    totalItens,
    irParaPagina,
    proximaPagina,
    paginaAnterior
  } = useEstoquePaginado({ produtos, itensPorPagina: 20 });

  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [modalMovimentacaoAberto, setModalMovimentacaoAberto] = useState(false);
  const [modalNovoProdutoAberto, setModalNovoProdutoAberto] = useState(false);
  const [modalPrevisaoAberto, setModalPrevisaoAberto] = useState(false);
  const [modalRetornoAberto, setModalRetornoAberto] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);
  const { toast } = useToast();
  const { gerarRelatorio, enviarAlertas, downloadRelatorio } = useRelatorios();

  const handleGerarRelatorio = async (tipo: string) => {
    try {
      const relatorio = await gerarRelatorio({ tipo: tipo as any });
      downloadRelatorio(relatorio, tipo);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    }
  };

  const handleEnviarAlertas = async () => {
    try {
      await enviarAlertas();
    } catch (error) {
      console.error('Erro ao enviar alertas:', error);
    }
  };

  const abrirDetalhes = (produto: any) => {
    setProdutoSelecionado(produto);
    setModalDetalhesAberto(true);
  };

  const abrirEdicao = (produto: any) => {
    setProdutoSelecionado(produto);
    setModalEdicaoAberto(true);
  };

  const abrirMovimentacao = (produto: any) => {
    setProdutoSelecionado(produto);
    setModalMovimentacaoAberto(true);
  };

  const abrirNovoProduto = () => {
    setModalNovoProdutoAberto(true);
  };

  const abrirPrevisao = (produto: any) => {
    setProdutoSelecionado(produto);
    setModalPrevisaoAberto(true);
  };

  const abrirRetorno = () => {
    setModalRetornoAberto(true);
  };

  const fecharModais = () => {
    setModalDetalhesAberto(false);
    setModalEdicaoAberto(false);
    setModalMovimentacaoAberto(false);
    setModalNovoProdutoAberto(false);
    setModalPrevisaoAberto(false);
    setModalRetornoAberto(false);
    setProdutoSelecionado(null);
  };

  const handleImageUploaded = () => {
    recarregarDados();
  };

  const toggleSelecionarProduto = (produtoId: string) => {
    setProdutosSelecionados(prev => 
      prev.includes(produtoId) 
        ? prev.filter(id => id !== produtoId)
        : [...prev, produtoId]
    );
  };

  const toggleSelecionarTodos = () => {
    if (todosSeleccionados) {
      setProdutosSelecionados([]);
      setTodosSeleccionados(false);
    } else {
      setProdutosSelecionados(produtosPaginados.map(produto => produto.id));
      setTodosSeleccionados(true);
    }
  };

  const handleExcluirSelecionados = async () => {
    if (produtosSelecionados.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${produtosSelecionados.length} produto(s)?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: false })
        .in('id', produtosSelecionados);

      if (error) {
        throw error;
      }

      toast({
        title: "Produtos excluídos",
        description: `${produtosSelecionados.length} produto(s) foram excluídos com sucesso.`,
      });

      setProdutosSelecionados([]);
      setTodosSeleccionados(false);
      recarregarDados();
    } catch (error: any) {
      console.error('Erro ao excluir produtos:', error);
      toast({
        title: "Erro ao excluir produtos",
        description: error.message,
        variant: "destructive",
      });
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Fixo */}
      <div className="flex-none bg-background border-b">
        <div className="max-w-7xl px-4 py-2 space-y-2">
      {/* Header */}
      <EstoqueHeader 
        produtosSelecionados={produtosSelecionados}
        loading={loading}
        onRefresh={recarregarDados}
        onExcluirSelecionados={handleExcluirSelecionados}
        onNovoProduto={abrirNovoProduto}
        onGerarRelatorio={handleGerarRelatorio}
        onEnviarAlertas={handleEnviarAlertas}
        onRetornoEstoque={abrirRetorno}
      />

      {/* Métricas em destaque logo após header */}
      <EstoqueBarraStatus metricas={metricas} />

      {/* Linha de controles compacta */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Filtros ocupando 2 colunas */}
        <div className="xl:col-span-2">
          <EstoqueFiltros 
            filtros={filtros}
            onAtualizarFiltros={atualizarFiltros}
            onLimparFiltros={limparFiltros}
          />
        </div>
        
        {/* File Manager ocupando 1 coluna */}
        <div className="xl:col-span-1">
          <EstoqueFileManager onUploadSuccess={recarregarDados} />
        </div>
        
        {/* Sincronização ocupando 1 coluna */}
        <div className="xl:col-span-1">
          <EstoqueSyncConfig />
        </div>
      </div>

        </div>
      </div>

      {/* Área da Tabela com Scroll Horizontal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto overflow-y-auto">
          <div className="min-w-max">
            <div className="max-w-7xl mx-auto px-4 py-2">
            {/* Tabela ocupando toda largura */}
            <EstoqueTabela 
              produtos={produtosPaginados}
              loading={loading}
              produtosSelecionados={produtosSelecionados}
              todosSeleccionados={todosSeleccionados}
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              itemInicial={itemInicial}
              itemFinal={itemFinal}
              totalItens={totalItens}
              onSelecionarProduto={toggleSelecionarProduto}
              onSelecionarTodos={toggleSelecionarTodos}
              onAbrirDetalhes={abrirDetalhes}
              onAbrirEdicao={abrirEdicao}
              onMovimentar={abrirMovimentacao}
              onImageUploaded={handleImageUploaded}
              onPaginar={irParaPagina}
              onPaginaAnterior={paginaAnterior}
              onProximaPagina={proximaPagina}
              onAbrirPrevisao={abrirPrevisao}
            />
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      <ProdutoDetalhesModal
        produto={produtoSelecionado}
        isOpen={modalDetalhesAberto}
        onClose={fecharModais}
      />

      <ProdutoEditModal
        produto={produtoSelecionado}
        isOpen={modalEdicaoAberto}
        onClose={fecharModais}
        onSave={recarregarDados}
      />

      <MovimentacaoModal
        produto={produtoSelecionado}
        isOpen={modalMovimentacaoAberto}
        onClose={fecharModais}
        onSuccess={recarregarDados}
      />

      <NovoProdutoModal
        isOpen={modalNovoProdutoAberto}
        onClose={fecharModais}
        onSuccess={recarregarDados}
      />

      <PrevisaoReposicaoModal
        produto={produtoSelecionado}
        isOpen={modalPrevisaoAberto}
        onClose={fecharModais}
      />

      <RetornoEstoqueModal
        isOpen={modalRetornoAberto}
        onClose={fecharModais}
        onSuccess={recarregarDados}
      />
    </div>
  );
}