import { useState } from 'react';
import { useHistoricoVendas } from '@/hooks/useHistoricoVendas';
import { useHistoricoVendasPaginado } from '@/hooks/useHistoricoVendasPaginado';
import { VendasHeader } from '@/components/vendas/VendasHeader';
import { VendasFiltros } from '@/components/vendas/VendasFiltros';
import { VendasMetricas } from '@/components/vendas/VendasMetricas';
import { VendasFileManager } from '@/components/vendas/VendasFileManager';
import { VendasTabela } from '@/components/vendas/VendasTabela';
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
  const [vendaParaEditar, setVendaParaEditar] = useState<any>(null);
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

  const selecionarVenda = (vendaId: string) => {
    setVendasSelecionadas(prev => 
      prev.includes(vendaId)
        ? prev.filter(id => id !== vendaId)
        : [...prev, vendaId]
    );
  };

  const selecionarTodas = () => {
    if (todasSelecionadas) {
      setVendasSelecionadas([]);
    } else {
      setVendasSelecionadas(vendasPaginadas.map(v => v.id));
    }
  };

  const todasSelecionadas = vendasPaginadas.length > 0 && 
    vendasPaginadas.every(v => vendasSelecionadas.includes(v.id));

  const abrirEdicao = (venda: any) => {
    setVendaParaEditar(venda);
    setShowEditModal(true);
  };

  const abrirExclusao = (id: string) => {
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
    <div className="space-y-6">
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

      <VendasTabela
        vendas={vendasPaginadas}
        loading={loading}
        vendasSelecionadas={vendasSelecionadas}
        todasSelecionadas={todasSelecionadas}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        itemInicial={itemInicial}
        itemFinal={itemFinal}
        totalItens={totalItens}
        onSelecionarVenda={selecionarVenda}
        onSelecionarTodas={selecionarTodas}
        onEditarVenda={abrirEdicao}
        onExcluirVenda={abrirExclusao}
        onPaginar={irParaPagina}
        onPaginaAnterior={paginaAnterior}
        onProximaPagina={proximaPagina}
      />

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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
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