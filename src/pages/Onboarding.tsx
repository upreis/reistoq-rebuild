import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { Building2, Users, Settings, CheckCircle } from 'lucide-react';

interface OnboardingData {
  organizacao: {
    nome: string;
    cnpj: string;
  };
  usuario: {
    nome: string;
    cargo: string;
  };
  configuracoes: {
    tiny_token: string;
    alertas_email: boolean;
  };
}

export function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    organizacao: { nome: '', cnpj: '' },
    usuario: { nome: '', cargo: '' },
    configuracoes: { tiny_token: '', alertas_email: true }
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const steps = [
    { id: 1, title: 'Empresa', icon: Building2 },
    { id: 2, title: 'Usuário', icon: Users },
    { id: 3, title: 'Integrações', icon: Settings },
    { id: 4, title: 'Concluído', icon: CheckCircle }
  ];

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Criar organização
      const { data: organizacao, error: orgError } = await supabase
        .from('organizacoes')
        .insert({
          nome: data.organizacao.nome,
          cnpj: data.organizacao.cnpj,
          plano: 'basico'
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Atualizar profile do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome_completo: data.usuario.nome,
          cargo: data.usuario.cargo,
          organizacao_id: organizacao.id
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (profileError) throw profileError;

      // 3. Criar configurações iniciais
      const configuracoes = [
        { chave: 'tiny_token', valor: data.configuracoes.tiny_token },
        { chave: 'alertas_email', valor: data.configuracoes.alertas_email.toString() },
        { chave: 'onboarding_completo', valor: 'true' }
      ];

      const { error: configError } = await supabase
        .from('configuracoes')
        .insert(configuracoes);

      if (configError) throw configError;

      toast({
        title: "Bem-vindo ao REISTOQ!",
        description: "Sua conta foi configurada com sucesso.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Erro no onboarding",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl gradient-primary bg-clip-text text-transparent">
            Bem-vindo ao REISTOQ
          </CardTitle>
          <p className="text-muted-foreground">
            Vamos configurar sua conta em alguns passos simples
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Stepper currentStep={step} steps={steps} />
          
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações da Empresa</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="nome_empresa">Nome da Empresa</Label>
                  <Input
                    id="nome_empresa"
                    value={data.organizacao.nome}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      organizacao: { ...prev.organizacao, nome: e.target.value }
                    }))}
                    placeholder="Ex: Minha Empresa Ltda"
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                  <Input
                    id="cnpj"
                    value={data.organizacao.cnpj}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      organizacao: { ...prev.organizacao, cnpj: e.target.value }
                    }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Suas Informações</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="nome_usuario">Seu Nome</Label>
                  <Input
                    id="nome_usuario"
                    value={data.usuario.nome}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      usuario: { ...prev.usuario, nome: e.target.value }
                    }))}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo/Função</Label>
                  <Input
                    id="cargo"
                    value={data.usuario.cargo}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      usuario: { ...prev.usuario, cargo: e.target.value }
                    }))}
                    placeholder="Ex: Gerente, Sócio, Responsável"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Integrações</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="tiny_token">Token Tiny ERP (Opcional)</Label>
                  <Input
                    id="tiny_token"
                    type="password"
                    value={data.configuracoes.tiny_token}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      configuracoes: { ...prev.configuracoes, tiny_token: e.target.value }
                    }))}
                    placeholder="Cole aqui seu token do Tiny ERP"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Você pode configurar depois em Configurações
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h3 className="text-lg font-semibold">Tudo Pronto!</h3>
              <p className="text-muted-foreground">
                Sua conta foi configurada com sucesso. Você já pode começar a usar o REISTOQ.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 && step < 4 && (
              <Button variant="outline" onClick={handleBack}>
                Voltar
              </Button>
            )}
            {step < 3 && (
              <Button 
                onClick={handleNext} 
                className="ml-auto"
                disabled={
                  (step === 1 && !data.organizacao.nome) ||
                  (step === 2 && !data.usuario.nome)
                }
              >
                Próximo
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleNext} className="ml-auto">
                Finalizar
              </Button>
            )}
            {step === 4 && (
              <Button 
                onClick={handleFinish} 
                disabled={loading}
                className="mx-auto"
              >
                {loading ? "Configurando..." : "Começar a Usar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}