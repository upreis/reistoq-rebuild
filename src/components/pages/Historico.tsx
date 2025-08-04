import { useState } from 'react';
import { useHistoricoMovimentacoes } from '@/hooks/useHistoricoMovimentacoes';
import { useHistoricoPaginado } from '@/hooks/useHistoricoPaginado';
import { HistoricoHeader } from '@/components/historico/HistoricoHeader';
import { HistoricoFiltros } from '@/components/historico/HistoricoFiltros';
import { HistoricoMetricas } from '@/components/historico/HistoricoMetricas';
import { HistoricoFileManager } from '@/components/historico/HistoricoFileManager';
import { HistoricoTabela } from '@/components/historico/HistoricoTabela';
import { NovaMovimentacaoModal } from '@/components/historico/NovaMovimentacaoModal';
import { MovimentacaoEditModal } from '@/components/historico/MovimentacaoEditModal';
import { useRelatorios } from '@/hooks/useRelatorios';
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

export function Historico() {
  const [movimentacoesSelecionadas, setMovimentacoesSelecionadas] = useState<string[]>([]);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteMultipleDialog, setShowDeleteMultipleDialog] = useState(false);
  const [movimentacaoParaEditar, setMovimentacaoParaEditar] = useState<any>(null);
  const [movimentacaoParaExcluir, setMovimentacaoParaExcluir] = useState<string | null>(null);

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
  } = useHistoricoPaginado({ movimentacoes });

  const { gerarRelatorio, downloadRelatorio } = useRelatorios();

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

  const abrirExclusao = (id: string) => {
    setMovimentacaoParaExcluir(id);
    setShowDeleteDialog(true);
  };

  const confirmarExclusao = async () => {
    if (movimentacaoParaExcluir) {
      await excluirMovimentacao(movimentacaoParaExcluir);
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

  const handleGerarRelatorio = async (tipo: string) => {
    try {
      const relatorio = await gerarRelatorio({ tipo: tipo as any });
      downloadRelatorio(relatorio, tipo);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    }
  };

  const handleModalSuccess = () => {
    recarregarDados();
    setMovimentacoesSelecionadas([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <HistoricoHeader
        movimentacoesSelecionadas={movimentacoesSelecionadas}
        loading={loading}
        onRefresh={recarregarDados}
        onExcluirSelecionadas={abrirExclusaoMultipla}
        onNovaMovimentacao={() => setShowNovaModal(true)}
        onGerarRelatorio={handleGerarRelatorio}
      />

      {/* Filters and File Management */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HistoricoFiltros
          filtros={filtros}
          onAtualizarFiltros={atualizarFiltros}
          onLimparFiltros={limparFiltros}
        />
        <HistoricoFileManager onUploadSuccess={handleModalSuccess} />
      </div>

      {/* Summary Cards */}
      <HistoricoMetricas metricas={metricas} loading={loading} />

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
        onExcluirMovimentacao={abrirExclusao}
        onPaginar={irParaPagina}
        onPaginaAnterior={paginaAnterior}
        onProximaPagina={proximaPagina}
      />

      <NovaMovimentacaoModal
        open={showNovaModal}
        onOpenChange={setShowNovaModal}
        onSuccess={handleModalSuccess}
      />

      <MovimentacaoEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        movimentacao={movimentacaoParaEditar}
        onSuccess={handleModalSuccess}
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