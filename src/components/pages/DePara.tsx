import React, { useState } from 'react';
import { useDePara } from '@/hooks/useDePara';
import { useDeParaPaginado } from '@/hooks/useDeParaPaginado';
import { DeParaHeader } from '@/components/depara/DeParaHeader';
import { DeParaMetricasAvancadas } from '@/components/depara/DeParaMetricasAvancadas';
import { DeParaFiltros } from '@/components/depara/DeParaFiltros';
import { DeParaFileManager } from '@/components/depara/DeParaFileManager';
import { DeParaTabela } from '@/components/depara/DeParaTabela';
import { DeParaOperacoesLote } from '@/components/depara/DeParaOperacoesLote';
import { DeParaHistorico } from '@/components/depara/DeParaHistorico';
import { NovoMapeamentoModal } from '@/components/depara/NovoMapeamentoModal';
import { MapeamentoEditModal } from '@/components/depara/MapeamentoEditModal';
import { MapeamentoDePara } from '@/hooks/useDePara';
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

export default function DePara() {
  const [mapeamentosSelecionados, setMapeamentosSelecionados] = useState<string[]>([]);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteMultipleDialog, setShowDeleteMultipleDialog] = useState(false);
  const [mapeamentoParaEditar, setMapeamentoParaEditar] = useState<MapeamentoDePara | null>(null);
  const [mapeamentoParaExcluir, setMapeamentoParaExcluir] = useState<string | null>(null);

  const {
    mapeamentos,
    metricas,
    loading,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    excluirMapeamento,
    excluirMapeamentosSelecionados
  } = useDePara();

  const {
    mapeamentosPaginados,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    totalItens,
    itemInicial,
    itemFinal
  } = useDeParaPaginado({ mapeamentos });

  const selecionarMapeamento = (mapeamentoId: string) => {
    setMapeamentosSelecionados(prev => 
      prev.includes(mapeamentoId)
        ? prev.filter(id => id !== mapeamentoId)
        : [...prev, mapeamentoId]
    );
  };

  const selecionarTodos = () => {
    if (todosSeleccionados) {
      setMapeamentosSelecionados([]);
    } else {
      setMapeamentosSelecionados(mapeamentosPaginados.map(m => m.id));
    }
  };

  const todosSeleccionados = mapeamentosPaginados.length > 0 && 
    mapeamentosPaginados.every(m => mapeamentosSelecionados.includes(m.id));

  const abrirEdicao = (mapeamento: MapeamentoDePara) => {
    setMapeamentoParaEditar(mapeamento);
    setShowEditModal(true);
  };

  const abrirExclusao = (id: string) => {
    setMapeamentoParaExcluir(id);
    setShowDeleteDialog(true);
  };

  const confirmarExclusao = async () => {
    if (mapeamentoParaExcluir) {
      await excluirMapeamento(mapeamentoParaExcluir);
      setMapeamentoParaExcluir(null);
      setShowDeleteDialog(false);
      setMapeamentosSelecionados([]);
    }
  };

  const abrirExclusaoMultipla = () => {
    setShowDeleteMultipleDialog(true);
  };

  const confirmarExclusaoMultipla = async () => {
    await excluirMapeamentosSelecionados(mapeamentosSelecionados);
    setMapeamentosSelecionados([]);
    setShowDeleteMultipleDialog(false);
  };

  const handleUploadSuccess = () => {
    recarregarDados();
  };

  const handleModalSuccess = () => {
    recarregarDados();
    setMapeamentosSelecionados([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Fixo */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-6 max-w-screen-2xl">
      {/* Header */}
      <DeParaHeader
        mapeamentosSelecionados={mapeamentosSelecionados}
        onNovoMapeamento={() => setShowNovoModal(true)}
        onExcluirSelecionados={abrirExclusaoMultipla}
      />

      {/* Filters and File Management */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DeParaFiltros
          filtros={filtros}
          onAtualizarFiltros={atualizarFiltros}
          onLimparFiltros={limparFiltros}
        />
        <DeParaFileManager onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Summary Cards */}
      <DeParaMetricasAvancadas metricas={metricas} loading={loading} />

        </div>
      </div>

      {/* Área da Tabela com Scroll Horizontal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto">
          <div className="min-w-max px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
            <DeParaTabela
              mapeamentos={mapeamentosPaginados}
              loading={loading}
              mapeamentosSelecionados={mapeamentosSelecionados}
              todosSeleccionados={todosSeleccionados}
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              itemInicial={itemInicial}
              itemFinal={itemFinal}
              totalItens={totalItens}
              onSelecionarMapeamento={selecionarMapeamento}
              onSelecionarTodos={selecionarTodos}
              onAbrirEdicao={abrirEdicao}
              onExcluirMapeamento={abrirExclusao}
              onPaginar={irParaPagina}
              onPaginaAnterior={paginaAnterior}
              onProximaPagina={proximaPagina}
            />

            {/* Operações em Lote */}
            <DeParaOperacoesLote 
              mapeamentosSelecionados={mapeamentosSelecionados}
              onRecarregarDados={recarregarDados}
            />

            {/* Histórico */}
            <DeParaHistorico />
          </div>
        </div>
      </div>

      <NovoMapeamentoModal
        open={showNovoModal}
        onOpenChange={setShowNovoModal}
        onSuccess={handleModalSuccess}
      />

      <MapeamentoEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        mapeamento={mapeamentoParaEditar}
        onSuccess={handleModalSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este mapeamento? Esta ação não pode ser desfeita.
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
              Tem certeza que deseja excluir {mapeamentosSelecionados.length} mapeamento(s) selecionado(s)? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusaoMultipla}>
              Excluir Selecionados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}