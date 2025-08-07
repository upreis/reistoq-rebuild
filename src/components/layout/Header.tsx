import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { user, signOut, organizacao } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/pedidos':
        return { title: 'Pedidos', subtitle: 'Gestão completa de pedidos' };
      case '/estoque':
        return { title: 'Estoque', subtitle: 'Controle de produtos' };
      case '/depara':
        return { title: 'De/Para', subtitle: 'Mapeamento de SKUs' };
      case '/scanner':
        return { title: 'Scanner', subtitle: 'Leitura de códigos' };
      case '/historico':
        return { title: 'Histórico', subtitle: 'Movimentações anteriores' };
      case '/configuracoes':
        return { title: 'Configurações', subtitle: 'Configurações do sistema' };
      default:
        return { title: 'Dashboard', subtitle: 'Visão geral' };
    }
  };

  const pageInfo = getPageTitle();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <SidebarTrigger />
      
      <div className="flex flex-col">
        <h1 className="text-lg font-bold text-foreground">{pageInfo.title}</h1>
        <p className="text-xs text-muted-foreground">{pageInfo.subtitle}</p>
      </div>
      
      <div className="w-full flex-1" />
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium">{user?.email}</p>
              {organizacao && (
                <p className="text-xs text-muted-foreground">{organizacao.nome}</p>
              )}
            </div>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}