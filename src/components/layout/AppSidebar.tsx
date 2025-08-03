import React from 'react';
import { Crown, Home, Package, ShoppingCart, ScanLine, BarChart3, Settings, History } from 'lucide-react';
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
    description: 'Visão geral'
  },
  {
    title: 'Estoque',
    url: '/estoque',
    icon: Package,
    description: 'Gestão de produtos'
  },
  {
    title: 'Pedidos',
    url: '/pedidos',
    icon: ShoppingCart,
    description: 'Gestão de pedidos'
  },
  {
    title: 'Scanner',
    url: '/scanner',
    icon: ScanLine,
    description: 'Leitor de códigos'
  },
  {
    title: 'Histórico',
    url: '/historico',
    icon: History,
    description: 'Histórico de ações'
  },
  {
    title: 'Configurações',
    url: '/configuracoes',
    icon: Settings,
    description: 'Configurações do sistema'
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
    return isActive(path) 
      ? 'bg-accent/10 text-accent border-r-2 border-accent' 
      : 'text-sidebar-foreground hover:bg-accent/5 hover:text-accent';
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/cece4f09-5a82-45ec-a712-fd6aabb235e9.png" 
              alt="REISTOQ Logo" 
              className="h-8 w-8 flex-shrink-0 object-contain"
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
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${getNavClasses(item.url)}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <div>
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