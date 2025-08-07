-- Configurar triggers essenciais que estão faltando

-- 1. Trigger para criar profile quando usuário se cadastra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Triggers para updated_at em todas as tabelas que precisam
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_historico_vendas_updated_at
  BEFORE UPDATE ON public.historico_vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_itens_pedidos_updated_at
  BEFORE UPDATE ON public.itens_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mapeamentos_depara_updated_at
  BEFORE UPDATE ON public.mapeamentos_depara
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Trigger para registrar movimentações de estoque
CREATE TRIGGER trigger_registrar_movimentacao_estoque
  AFTER UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_movimentacao_estoque();

-- 4. Trigger para alertas em tempo real de estoque
CREATE TRIGGER trigger_verificar_alertas_tempo_real
  AFTER UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.verificar_alertas_tempo_real();

-- 5. Trigger para histórico de DePara
CREATE TRIGGER trigger_historico_depara_insert
  AFTER INSERT ON public.mapeamentos_depara
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_depara();

CREATE TRIGGER trigger_historico_depara_update
  AFTER UPDATE ON public.mapeamentos_depara
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_depara();

CREATE TRIGGER trigger_historico_depara_delete
  AFTER DELETE ON public.mapeamentos_depara
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_depara();