import { useState, useEffect } from "react";
import { 
  Eye, Edit, Trash2, Download, Settings, MoreHorizontal, 
  CheckSquare, Square 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { formatarMoeda, formatarData } from "@/lib/utils";

interface HistoricoVenda {
  id: string;
  id_unico: string;
  numero_pedido: string;
  sku_produto: string;
  descricao: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  observacoes: string | null;
  data_pedido: string;
  created_at: string;
  updated_at: string;
  // Novas colunas adicionadas
  ncm: string | null;
  codigo_barras: string | null;
  pedido_id: string | null;
  cpf_cnpj: string | null;
  valor_frete: number | null;
  data_prevista: string | null;
  obs: string | null;
  obs_interna: string | null;
  cidade: string | null;
  uf: string | null;
  url_rastreamento: string | null;
  situacao: string | null;
  codigo_rastreamento: string | null;
  numero_ecommerce: string | null;
  valor_desconto: number | null;
}

interface HistoricoVendasTabelaProps {
  vendas: HistoricoVenda[];
  vendasSelecionadas: string[];
  onSelecaoChange: (vendas: string[]) => void;
  loading: boolean;
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itemInicial: number;
  itemFinal: number;
  onPaginaChange: (pagina: number) => void;
  onProximaPagina: () => void;
  onPaginaAnterior: () => void;
  onEditarVenda: (venda: HistoricoVenda) => void;
  onExcluirVenda: (id: string) => void;
}

export function HistoricoVendasTabela({
  vendas,
  vendasSelecionadas,
  onSelecaoChange,
  loading,
  paginaAtual,
  totalPaginas,
  totalItens,
  itemInicial,
  itemFinal,
  onPaginaChange,
  onProximaPagina,
  onPaginaAnterior,
  onEditarVenda,
  onExcluirVenda
}: HistoricoVendasTabelaProps) {
  // Carrega configuração salva ou usa padrão
  const [colunasVisiveis, setColunasVisiveis] = useState(() => {
    const savedConfig = localStorage.getItem('historico-vendas-colunas-config');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch {
        // Se der erro no parse, usa configuração padrão
      }
    }
    return {
      idUnico: true,
      numeroPedido: true,
      descricao: true,
      clienteNome: true,
      cidade: false,
      uf: false,
      situacao: false,
      codigoRastreamento: false,
      numeroEcommerce: false,
      valorFrete: false,
      valorDesconto: false,
      dataPrevista: false,
      ncm: false,
      codigoBarras: false,
      cpfCnpj: false,
      obs: false,
      obsInterna: false,
      urlRastreamento: false
    };
  });

  // Salva configuração sempre que mudar
  useEffect(() => {
    localStorage.setItem('historico-vendas-colunas-config', JSON.stringify(colunasVisiveis));
  }, [colunasVisiveis]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluida':
        return <Badge className="bg-green-600">Concluída</Badge>;
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'processando':
        return <Badge variant="outline">Processando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSituacaoBadge = (situacao: string | null) => {
    if (!situacao) return <span className="text-muted-foreground">-</span>;
    
    const situacaoLower = situacao.toLowerCase();
    
    switch (situacaoLower) {
      case 'em aberto':
        return <Badge variant="secondary">Em Aberto</Badge>;
      case 'aprovado':
        return <Badge variant="default">Aprovado</Badge>;
      case 'preparando envio':
        return <Badge variant="secondary">Preparando</Badge>;
      case 'faturado':
        return <Badge variant="outline">Faturado</Badge>;
      case 'pronto para envio':
        return <Badge variant="secondary">Pronto</Badge>;
      case 'enviado':
        return <Badge className="bg-blue-600">Enviado</Badge>;
      case 'entregue':
        return <Badge className="bg-green-600">Entregue</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'em separacao':
        return <Badge variant="outline">Separação</Badge>;
      case 'atendido':
        return <Badge className="bg-emerald-600">Atendido</Badge>;
      case 'nao entregue':
        return <Badge variant="destructive">Não Entregue</Badge>;
      default:
        return <Badge variant="outline">{situacao}</Badge>;
    }
  };

  // Função para verificar se venda está selecionada
  const isVendaSelecionada = (vendaId: string) => {
    return vendasSelecionadas.includes(vendaId);
  };

  // Função para alternar seleção de uma venda
  const toggleSelecaoVenda = (vendaId: string) => {
    if (isVendaSelecionada(vendaId)) {
      onSelecaoChange(vendasSelecionadas.filter(id => id !== vendaId));
    } else {
      onSelecaoChange([...vendasSelecionadas, vendaId]);
    }
  };

  // Função para selecionar/deselecionar todas as vendas
  const toggleSelecaoTodas = () => {
    if (vendasSelecionadas.length === vendas.length) {
      onSelecaoChange([]);
    } else {
      onSelecaoChange(vendas.map(venda => venda.id));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando histórico...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (vendas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma venda encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não há vendas que correspondam aos filtros aplicados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Histórico de Vendas ({totalItens} {totalItens === 1 ? 'venda' : 'vendas'})
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, idUnico: !prev.idUnico }))}>
              <Checkbox checked={colunasVisiveis.idUnico} className="mr-2" />
              ID Único
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, numeroPedido: !prev.numeroPedido }))}>
              <Checkbox checked={colunasVisiveis.numeroPedido} className="mr-2" />
              Número do Pedido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, descricao: !prev.descricao }))}>
              <Checkbox checked={colunasVisiveis.descricao} className="mr-2" />
              Descrição
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, clienteNome: !prev.clienteNome }))}>
              <Checkbox checked={colunasVisiveis.clienteNome} className="mr-2" />
              Cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, cidade: !prev.cidade }))}>
              <Checkbox checked={colunasVisiveis.cidade} className="mr-2" />
              Cidade
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, uf: !prev.uf }))}>
              <Checkbox checked={colunasVisiveis.uf} className="mr-2" />
              UF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, situacao: !prev.situacao }))}>
              <Checkbox checked={colunasVisiveis.situacao} className="mr-2" />
              Situação do Pedido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, codigoRastreamento: !prev.codigoRastreamento }))}>
              <Checkbox checked={colunasVisiveis.codigoRastreamento} className="mr-2" />
              Código Rastreamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, numeroEcommerce: !prev.numeroEcommerce }))}>
              <Checkbox checked={colunasVisiveis.numeroEcommerce} className="mr-2" />
              Número E-commerce
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, valorFrete: !prev.valorFrete }))}>
              <Checkbox checked={colunasVisiveis.valorFrete} className="mr-2" />
              Valor Frete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, valorDesconto: !prev.valorDesconto }))}>
              <Checkbox checked={colunasVisiveis.valorDesconto} className="mr-2" />
              Valor Desconto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, dataPrevista: !prev.dataPrevista }))}>
              <Checkbox checked={colunasVisiveis.dataPrevista} className="mr-2" />
              Data Prevista
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, ncm: !prev.ncm }))}>
              <Checkbox checked={colunasVisiveis.ncm} className="mr-2" />
              NCM
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, codigoBarras: !prev.codigoBarras }))}>
              <Checkbox checked={colunasVisiveis.codigoBarras} className="mr-2" />
              Código de Barras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColunasVisiveis(prev => ({ ...prev, cpfCnpj: !prev.cpfCnpj }))}>
              <Checkbox checked={colunasVisiveis.cpfCnpj} className="mr-2" />
              CPF/CNPJ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2">
                    <Checkbox
                      checked={vendasSelecionadas.length === vendas.length && vendas.length > 0}
                      onCheckedChange={toggleSelecaoTodas}
                      aria-label="Selecionar todas as vendas"
                    />
                  </TableHead>
                  {colunasVisiveis.idUnico && <TableHead className="px-2 min-w-[120px]">ID Único</TableHead>}
                  {colunasVisiveis.numeroPedido && <TableHead className="px-2 min-w-[100px]">Pedido</TableHead>}
                  <TableHead className="px-2 min-w-[120px]">Data</TableHead>
                  <TableHead className="px-2 min-w-[120px]">SKU</TableHead>
                  {colunasVisiveis.descricao && <TableHead className="px-2 max-w-[200px]">Descrição</TableHead>}
                  <TableHead className="px-2 w-16">Qtd</TableHead>
                  <TableHead className="px-2 min-w-[120px]">Valor Unit.</TableHead>
                  <TableHead className="px-2 min-w-[120px]">Valor Total</TableHead>
                  {colunasVisiveis.clienteNome && <TableHead className="px-2 max-w-[180px]">Cliente</TableHead>}
                  {colunasVisiveis.cidade && <TableHead className="px-2 min-w-[100px]">Cidade</TableHead>}
                  {colunasVisiveis.uf && <TableHead className="px-2 min-w-[60px]">UF</TableHead>}
                  <TableHead className="px-2 min-w-[100px]">Status</TableHead>
                  {colunasVisiveis.situacao && <TableHead className="px-2 min-w-[120px]">Situação</TableHead>}
                  {colunasVisiveis.codigoRastreamento && <TableHead className="px-2 min-w-[120px]">Rastreamento</TableHead>}
                  {colunasVisiveis.numeroEcommerce && <TableHead className="px-2 min-w-[120px]">E-commerce</TableHead>}
                  {colunasVisiveis.valorFrete && <TableHead className="px-2 min-w-[100px]">Frete</TableHead>}
                  {colunasVisiveis.valorDesconto && <TableHead className="px-2 min-w-[100px]">Desconto</TableHead>}
                  {colunasVisiveis.dataPrevista && <TableHead className="px-2 min-w-[120px]">Data Prevista</TableHead>}
                  {colunasVisiveis.ncm && <TableHead className="px-2 min-w-[100px]">NCM</TableHead>}
                  {colunasVisiveis.codigoBarras && <TableHead className="px-2 min-w-[120px]">Cód. Barras</TableHead>}
                  {colunasVisiveis.cpfCnpj && <TableHead className="px-2 min-w-[120px]">CPF/CNPJ</TableHead>}
                  <TableHead className="px-2 min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="px-2 w-12">
                      <Checkbox
                        checked={isVendaSelecionada(venda.id)}
                        onCheckedChange={() => toggleSelecaoVenda(venda.id)}
                        aria-label={`Selecionar venda ${venda.id_unico}`}
                      />
                    </TableCell>
                    
                    {colunasVisiveis.idUnico && (
                      <TableCell className="font-mono text-xs px-2">
                        <div className="min-w-[120px] truncate" title={venda.id_unico}>
                          {venda.id_unico}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.numeroPedido && (
                      <TableCell className="font-medium px-2">
                        <div className="min-w-[100px] truncate">
                          #{venda.numero_pedido}
                        </div>
                      </TableCell>
                    )}

                    <TableCell className="px-2">
                      <div className="text-sm min-w-[120px]">
                        {formatarData(venda.data_pedido)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2">
                      <div className="font-mono text-sm min-w-[120px] truncate" title={venda.sku_produto}>
                        {venda.sku_produto}
                      </div>
                    </TableCell>
                    
                    {colunasVisiveis.descricao && (
                      <TableCell className="px-2">
                        <div className="max-w-[200px] truncate" title={venda.descricao || ''}>
                          {venda.descricao || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell className="text-center px-2 w-16">
                      {venda.quantidade}
                    </TableCell>
                    
                    <TableCell className="px-2 min-w-[120px]">
                      {formatarMoeda(venda.valor_unitario)}
                    </TableCell>
                    
                    <TableCell className="px-2 min-w-[120px] font-medium">
                      {formatarMoeda(venda.valor_total)}
                    </TableCell>
                    
                    {colunasVisiveis.clienteNome && (
                      <TableCell className="px-2">
                        <div className="max-w-[180px] truncate" title={venda.cliente_nome || ''}>
                          {venda.cliente_nome || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.cidade && (
                      <TableCell className="px-2">
                        <div className="min-w-[100px] truncate" title={venda.cidade || ''}>
                          {venda.cidade || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.uf && (
                      <TableCell className="px-2 text-center w-16">
                        {venda.uf || '-'}
                      </TableCell>
                    )}
                    
                    <TableCell className="px-2">
                      {getStatusBadge(venda.status)}
                    </TableCell>
                    
                    {colunasVisiveis.situacao && (
                      <TableCell className="px-2">
                        {getSituacaoBadge(venda.situacao)}
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.codigoRastreamento && (
                      <TableCell className="px-2">
                        <div className="min-w-[120px] truncate" title={venda.codigo_rastreamento || ''}>
                          {venda.codigo_rastreamento || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.numeroEcommerce && (
                      <TableCell className="px-2">
                        <div className="min-w-[120px] truncate" title={venda.numero_ecommerce || ''}>
                          {venda.numero_ecommerce || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.valorFrete && (
                      <TableCell className="px-2 min-w-[100px]">
                        {venda.valor_frete ? formatarMoeda(venda.valor_frete) : '-'}
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.valorDesconto && (
                      <TableCell className="px-2 min-w-[100px]">
                        {venda.valor_desconto ? formatarMoeda(venda.valor_desconto) : '-'}
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.dataPrevista && (
                      <TableCell className="px-2">
                        <div className="text-sm min-w-[120px]">
                          {venda.data_prevista ? formatarData(venda.data_prevista) : '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.ncm && (
                      <TableCell className="px-2">
                        <div className="min-w-[100px] truncate" title={venda.ncm || ''}>
                          {venda.ncm || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.codigoBarras && (
                      <TableCell className="px-2">
                        <div className="font-mono text-sm min-w-[120px] truncate" title={venda.codigo_barras || ''}>
                          {venda.codigo_barras || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    {colunasVisiveis.cpfCnpj && (
                      <TableCell className="px-2">
                        <div className="font-mono text-sm min-w-[120px] truncate" title={venda.cpf_cnpj || ''}>
                          {venda.cpf_cnpj || '-'}
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell className="px-2 min-w-[100px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditarVenda(venda)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onExcluirVenda(venda.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {paginaAtual} de {totalPaginas}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={onPaginaAnterior}
                        className={paginaAtual <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let pageNumber;
                      if (totalPaginas <= 5) {
                        pageNumber = i + 1;
                      } else if (paginaAtual <= 3) {
                        pageNumber = i + 1;
                      } else if (paginaAtual >= totalPaginas - 2) {
                        pageNumber = totalPaginas - 4 + i;
                      } else {
                        pageNumber = paginaAtual - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => onPaginaChange(pageNumber)}
                            isActive={pageNumber === paginaAtual}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={onProximaPagina}
                        className={paginaAtual >= totalPaginas ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}