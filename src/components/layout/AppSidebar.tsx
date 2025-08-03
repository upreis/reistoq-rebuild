import React from 'react';
import { Home, Package, ShoppingCart, ScanLine, BarChart3, Settings, History, ArrowLeftRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
    description: 'Visão geral do sistema'
  },
  {
    title: 'Estoque',
    url: '/estoque',
    icon: Package,
    description: 'Gerenciar produtos'
  },
  {
    title: 'Pedidos',
    url: '/pedidos',
    icon: ShoppingCart,
    description: 'Gerenciar pedidos'
  },
  {
    title: 'Scanner',
    url: '/scanner',
    icon: ScanLine,
    description: 'Leitor de código'
  },
  {
    title: 'De/Para',
    url: '/de-para',
    icon: ArrowLeftRight,
    description: 'Mapeamento SKUs'
  },
  {
    title: 'Histórico',
    url: '/historico',
    icon: History,
    description: 'Logs do sistema'
  },
  {
    title: 'Configurações',
    url: '/configuracoes',
    icon: Settings,
    description: 'Configurar sistema'
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { theme } = useTheme();
  const collapsed = state === 'collapsed';
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getNavClasses = (path: string) => {
    if (isActive(path)) {
      return 'bg-transparent text-accent relative before:absolute before:inset-0 before:rounded-lg before:border-2 before:border-accent before:bg-accent/10';
    }
    return 'text-sidebar-foreground hover:bg-accent/5 hover:text-accent transition-all duration-200';
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarContent>
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/78a28708-1e34-459a-b347-1c12a0b5b9e7.png" 
              alt="REISTOQ Logo" 
              className="h-16 w-16 flex-shrink-0 object-contain"
            />
            {!collapsed && (
              <div>
                <span className="text-xl font-bold text-accent">REISTOQ</span>
                <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60 px-3 py-2">Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200 ${getNavClasses(item.url)}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}