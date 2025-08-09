import React from 'react';
import { Crown, Home, Package, ShoppingCart, ScanLine, ArrowLeftRight, Settings, History } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';
import { usePermissions } from '@/hooks/usePermissions';
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
    description: 'Visão geral',
    permission: 'dashboard:view'
  },
  {
    title: 'Estoque',
    url: '/estoque',
    icon: Package,
    description: 'Gestão de produtos',
    permission: 'estoque:view'
  },
  {
    title: 'Pedidos',
    url: '/pedidos',
    icon: ShoppingCart,
    description: 'Gestão de pedidos',
    permission: 'pedidos:view'
  },
  {
    title: 'SKU Mapa',
    url: '/depara',
    icon: ArrowLeftRight,
    description: 'Mapeamento de SKUs',
    permission: 'depara:view'
  },
  {
    title: 'Scanner',
    url: '/scanner',
    icon: ScanLine,
    description: 'Leitor de códigos',
    permission: 'scanner:use'
  },
  {
    title: 'Histórico',
    url: '/historico',
    icon: History,
    description: 'Histórico de ações',
    permission: 'historico:view'
  },
  {
    title: 'Configurações',
    url: '/configuracoes',
    icon: Settings,
    description: 'Configurações do sistema',
    permission: 'configuracoes:view'
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { theme } = useTheme();
  const { isLoading, hasPermission } = usePermissions();
  const collapsed = state === 'collapsed';
  
  const [tickerCollapsed, setTickerCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem('announcementTicker:collapsed') === '1'; } catch { return false; }
  });
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setTickerCollapsed(Boolean(detail));
    };
    window.addEventListener('announcementTicker:collapse-changed', handler as EventListener);
    return () => window.removeEventListener('announcementTicker:collapse-changed', handler as EventListener);
  }, []);
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  const getNavClasses = (path: string) => {
    return isActive(path) 
      ? 'bg-accent/10 text-accent border-r-2 border-accent' 
      : 'text-sidebar-foreground hover:bg-accent/5 hover:text-accent';
  };

  const topCls = tickerCollapsed ? 'top-0' : 'top-11 sm:top-12';
  const heightCls = tickerCollapsed ? 'h-svh' : 'h-[calc(100svh-44px)] sm:h-[calc(100svh-48px)]';

  const itemsToShow = isLoading ? navigationItems : navigationItems.filter((i) => hasPermission(i.permission));

  return (
    <Sidebar collapsible="icon" className={`border-r border-sidebar-border ${topCls} ${heightCls}`}>
      <SidebarContent>
        {/* Header */}
        <div className={`border-b border-sidebar-border ${collapsed ? 'px-3 py-3' : 'px-6 py-3'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <img 
              src="/lovable-uploads/78a28708-1e34-459a-b347-1c12a0b5b9e7.png" 
              alt="REISTOQ Logo" 
              className={`flex-shrink-0 object-contain ${collapsed ? 'h-8 w-8' : 'h-12 w-12'}`}
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
              {itemsToShow.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className={`flex items-center gap-3 px-3 py-3 mb-2 rounded-lg text-sm transition-colors duration-200 ${getNavClasses(item.url)}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <div className="font-medium">{item.title}</div>
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