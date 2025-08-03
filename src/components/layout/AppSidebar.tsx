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
    description: "Visão geral do sistema"
  },
  { 
    id: "estoque", 
    title: "Estoque", 
    icon: Package,
    description: "Gerenciar produtos"
  },
  { 
    id: "pedidos", 
    title: "Pedidos", 
    icon: ShoppingCart,
    description: "Gerenciar pedidos"
  },
  { 
    id: "scanner", 
    title: "Scanner", 
    icon: ScanLine,
    description: "Leitor de código"
  },
  { 
    id: "depara", 
    title: "De/Para", 
    icon: ArrowLeftRight,
    description: "Mapeamento SKUs"
  },
  { 
    id: "historico", 
    title: "Histórico", 
    icon: History,
    description: "Logs do sistema"
  },
  { 
    id: "configuracoes", 
    title: "Configurações", 
    icon: Settings,
    description: "Configurar sistema"
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
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-elegant">
              <img 
                src="/lovable-uploads/bb169aaa-4a45-4eae-9ca4-e8e4e1ca5196.png" 
                alt="REISTOQ" 
                className="w-6 h-6 object-contain"
              />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-lg text-accent">REISTOQ</h1>
                <p className="text-sm text-sidebar-foreground/70">Sistema de Gestão</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-2 py-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg
                      transition-all duration-200
                      ${collapsed ? 'justify-center' : ''}
                      ${activeTab === item.id 
                        ? "bg-accent/20 text-accent border border-accent/30" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium">{item.title}</span>
                        <span className="text-xs text-sidebar-foreground/60">{item.description}</span>
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