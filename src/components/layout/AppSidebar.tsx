import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  ArrowLeftRight, 
  History, 
  ScanLine, 
  Settings,
  Building2
} from "lucide-react";
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
} from "@/components/ui/sidebar";

const menuItems = [
  { 
    id: "dashboard", 
    title: "Dashboard", 
    icon: BarChart3,
    description: "Visão geral e métricas"
  },
  { 
    id: "pedidos", 
    title: "Pedidos", 
    icon: ShoppingCart,
    description: "Integração Tiny ERP"
  },
  { 
    id: "estoque", 
    title: "Estoque", 
    icon: Package,
    description: "Controle de produtos"
  },
  { 
    id: "depara", 
    title: "DE/PARA", 
    icon: ArrowLeftRight,
    description: "Mapeamento SKUs"
  },
  { 
    id: "historico", 
    title: "Histórico", 
    icon: History,
    description: "Log de operações"
  },
  { 
    id: "scanner", 
    title: "Scanner", 
    icon: ScanLine,
    description: "Código de barras"
  },
  { 
    id: "configuracoes", 
    title: "Configurações", 
    icon: Settings,
    description: "APIs e preferências"
  },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-md">
              <img 
                src="/src/assets/logo.png" 
                alt="REISTOQ" 
                className="w-5 h-5 object-contain brightness-0 invert"
              />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground">REISTOQ</h1>
                <p className="text-xs text-sidebar-foreground/60">Sistema de Estoque</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    className={`
                      transition-all duration-200
                      ${activeTab === item.id 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && (
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs opacity-70">{item.description}</span>
                      </div>
                    )}
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