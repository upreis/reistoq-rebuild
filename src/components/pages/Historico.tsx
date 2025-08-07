import { useState } from 'react';
import { useHistoricoVendas } from '@/hooks/useHistoricoVendas';
import { useHistoricoVendasPaginado } from '@/hooks/useHistoricoVendasPaginado';
import { VendasHeader } from '@/components/vendas/VendasHeader';
import { VendasFiltros } from '@/components/vendas/VendasFiltros';
import { VendasMetricas } from '@/components/vendas/VendasMetricas';
import { VendasFileManager } from '@/components/vendas/VendasFileManager';
import { HistoricoVendasTabela } from '@/components/historico/HistoricoVendasTabela';
import { NovaVendaModal } from '@/components/vendas/NovaVendaModal';
import { VendaEditModal } from '@/components/vendas/VendaEditModal';
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
  const [vendasSelecionadas, setVendasSelecionadas] = useState<string[]>([]);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteMultipleDialog, setShowDeleteMultipleDialog] = useState(false);
  const [vendaParaEditar, setVendaParaEditar] = useState<any | null>(null);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<string | null>(null);

  const {
    vendas,
    metricas,
    loading,
    filtros,
    atualizarFiltros,
    limparFiltros,
    recarregarDados,
    excluirVenda,
    excluirVendasSelecionadas
  } = useHistoricoVendas();

  const {
    vendasPaginadas,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    totalItens,
    itemInicial,
    itemFinal
  } = useHistoricoVendasPaginado({ vendas });

  const { gerarRelatorio, downloadRelatorio } = useRelatorios();

  const editarVenda = (venda: any) => {
    setVendaParaEditar(venda);
    setShowEditModal(true);
  };

  const excluirVendaAction = (id: string) => {
    setVendaParaExcluir(id);
    setShowDeleteDialog(true);
  };

  const confirmarExclusao = async () => {
    if (vendaParaExcluir) {
      await excluirVenda(vendaParaExcluir);
      setVendaParaExcluir(null);
      setShowDeleteDialog(false);
      setVendasSelecionadas([]);
    }
  };

  const abrirExclusaoMultipla = () => {
    setShowDeleteMultipleDialog(true);
  };

  const confirmarExclusaoMultipla = async () => {
    await excluirVendasSelecionadas(vendasSelecionadas);
    setVendasSelecionadas([]);
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
    setVendasSelecionadas([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Fixo */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-6 max-w-screen-2xl">
      <VendasHeader
        vendasSelecionadas={vendasSelecionadas}
        loading={loading}
        onRefresh={recarregarDados}
        onExcluirSelecionadas={abrirExclusaoMultipla}
        onNovaVenda={() => setShowNovaModal(true)}
        onGerarRelatorio={handleGerarRelatorio}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <VendasFiltros
          filtros={filtros}
          onAtualizarFiltros={atualizarFiltros}
        />
        <VendasFileManager onUploadSuccess={handleModalSuccess} />
      </div>

      <VendasMetricas metricas={metricas} loading={loading} />

        </div>
      </div>

      {/* Área da Tabela com Scroll Horizontal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto">
          <div className="min-w-max px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
            <HistoricoVendasTabela
              vendas={vendasPaginadas}
              vendasSelecionadas={vendasSelecionadas}
              onSelecaoChange={setVendasSelecionadas}
              loading={loading}
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              totalItens={totalItens}
              itemInicial={itemInicial}
              itemFinal={itemFinal}
              onPaginaChange={irParaPagina}
              onProximaPagina={proximaPagina}
              onPaginaAnterior={paginaAnterior}
              onEditarVenda={editarVenda}
              onExcluirVenda={excluirVendaAction}
            />
          </div>
        </div>
      </div>

      <NovaVendaModal
        open={showNovaModal}
        onOpenChange={setShowNovaModal}
        onSuccess={handleModalSuccess}
      />

      <VendaEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        venda={vendaParaEditar}
        onSuccess={handleModalSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão da venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? 
              <br />
              <strong>⚠️ O estoque será automaticamente extornado/revertido com base no SKU Kit e Total de Itens.</strong>
              <br />
              Esta ação não pode ser desfeita.
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
              Tem certeza que deseja excluir {vendasSelecionadas.length} venda(s) selecionada(s)? 
              <br />
              <strong>⚠️ O estoque será automaticamente extornado/revertido para todas as vendas com SKU Kit válido.</strong>
              <br />
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