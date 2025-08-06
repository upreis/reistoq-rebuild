import { useState } from 'react';
import { useHistoricoMovimentacoes } from '@/hooks/useHistoricoMovimentacoes';
import { useHistoricoPaginado } from '@/hooks/useHistoricoPaginado';
import { HistoricoFiltros } from '@/components/historico/HistoricoFiltros';
import { HistoricoMetricas } from '@/components/historico/HistoricoMetricas';
import { HistoricoTabela } from '@/components/historico/HistoricoTabela';
import { NovaMovimentacaoModal } from '@/components/historico/NovaMovimentacaoModal';
import { MovimentacaoEditModal } from '@/components/historico/MovimentacaoEditModal';
import { ExclusaoMovimentacaoModal } from '@/components/estoque/ExclusaoMovimentacaoModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EstoqueHistoricoMovimentacoes() {
  const [movimentacoesSelecionadas, setMovimentacoesSelecionadas] = useState<string[]>([]);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteMultipleDialog, setShowDeleteMultipleDialog] = useState(false);
  const [showExclusaoModal, setShowExclusaoModal] = useState(false);
  const [movimentacaoParaEditar, setMovimentacaoParaEditar] = useState<any>(null);
  const [movimentacaoParaExcluir, setMovimentacaoParaExcluir] = useState<any>(null);

  const {
    movimentacoes,
    metricas,
    loading,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    excluirMovimentacao,
    excluirMovimentacoesSelecionadas
  } = useHistoricoMovimentacoes();

  const {
    movimentacoesPaginadas,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    totalItens,
    itemInicial,
    itemFinal
  } = useHistoricoPaginado({ movimentacoes, itensPorPagina: 10 });

  const selecionarMovimentacao = (movimentacaoId: string) => {
    setMovimentacoesSelecionadas(prev => 
      prev.includes(movimentacaoId)
        ? prev.filter(id => id !== movimentacaoId)
        : [...prev, movimentacaoId]
    );
  };

  const selecionarTodas = () => {
    if (todasSelecionadas) {
      setMovimentacoesSelecionadas([]);
    } else {
      setMovimentacoesSelecionadas(movimentacoesPaginadas.map(m => m.id));
    }
  };

  const todasSelecionadas = movimentacoesPaginadas.length > 0 && 
    movimentacoesPaginadas.every(m => movimentacoesSelecionadas.includes(m.id));

  const abrirEdicao = (movimentacao: any) => {
    setMovimentacaoParaEditar(movimentacao);
    setShowEditModal(true);
  };

  const abrirExclusao = (movimentacao: any) => {
    setMovimentacaoParaExcluir(movimentacao);
    setShowExclusaoModal(true);
  };

  const confirmarExclusaoAvancada = async (movimentacaoId: string, retornarAoEstoque: boolean) => {
    if (retornarAoEstoque) {
      // Lógica para retornar ao estoque será implementada no hook
      await excluirMovimentacao(movimentacaoId, true);
    } else {
      await excluirMovimentacao(movimentacaoId);
    }
    setMovimentacaoParaExcluir(null);
    setShowExclusaoModal(false);
    setMovimentacoesSelecionadas([]);
  };

  const confirmarExclusao = async () => {
    if (movimentacaoParaExcluir) {
      await excluirMovimentacao(movimentacaoParaExcluir.id);
      setMovimentacaoParaExcluir(null);
      setShowDeleteDialog(false);
      setMovimentacoesSelecionadas([]);
    }
  };

  const abrirExclusaoMultipla = () => {
    setShowDeleteMultipleDialog(true);
  };

  const confirmarExclusaoMultipla = async () => {
    await excluirMovimentacoesSelecionadas(movimentacoesSelecionadas);
    setMovimentacoesSelecionadas([]);
    setShowDeleteMultipleDialog(false);
  };

  const handleModalSuccess = () => {
    recarregarDados();
    setMovimentacoesSelecionadas([]);
  };

  return (
    <div className="space-y-6">
      {/* Header Compacto */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Movimentações</CardTitle>
              <CardDescription>
                Controle completo das movimentações de estoque
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={recarregarDados}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button 
                size="sm" 
                onClick={() => setShowNovaModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
              {movimentacoesSelecionadas.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={abrirExclusaoMultipla}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir ({movimentacoesSelecionadas.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <HistoricoFiltros
        filtros={filtros}
        onAtualizarFiltros={atualizarFiltros}
        onLimparFiltros={limparFiltros}
      />

      {/* Métricas */}
      <HistoricoMetricas metricas={metricas} loading={loading} />

      {/* Tabela de Movimentações */}
      <HistoricoTabela
        movimentacoes={movimentacoesPaginadas}
        loading={loading}
        movimentacoesSelecionadas={movimentacoesSelecionadas}
        todasSelecionadas={todasSelecionadas}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        itemInicial={itemInicial}
        itemFinal={itemFinal}
        totalItens={totalItens}
        onSelecionarMovimentacao={selecionarMovimentacao}
        onSelecionarTodas={selecionarTodas}
        onEditarMovimentacao={abrirEdicao}
        onExcluirMovimentacao={(movimentacao) => abrirExclusao(movimentacao)}
        onPaginar={irParaPagina}
        onPaginaAnterior={paginaAnterior}
        onProximaPagina={proximaPagina}
      />

      {/* Modais */}
      <NovaMovimentacaoModal
        open={showNovaModal}
        onOpenChange={setShowNovaModal}
        onSuccess={handleModalSuccess}
      />

      <MovimentacaoEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        movimentacao={movimentacaoParaEditar}
        onSuccess={recarregarDados}
      />

      <ExclusaoMovimentacaoModal
        isOpen={showExclusaoModal}
        onClose={() => {
          setShowExclusaoModal(false);
          setMovimentacaoParaExcluir(null);
        }}
        movimentacao={movimentacaoParaExcluir}
        onConfirm={confirmarExclusaoAvancada}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteMultipleDialog} onOpenChange={setShowDeleteMultipleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão múltipla</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {movimentacoesSelecionadas.length} movimentação(ões) selecionada(s)? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusaoMultipla}>
              Excluir Selecionadas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}