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
    icon: BarChart3
  },
  { 
    id: "pedidos", 
    title: "Pedidos", 
    icon: ShoppingCart
  },
  { 
    id: "estoque", 
    title: "Estoque", 
    icon: Package
  },
  { 
    id: "depara", 
    title: "DE/PARA", 
    icon: ArrowLeftRight
  },
  { 
    id: "historico", 
    title: "Histórico", 
    icon: History
  },
  { 
    id: "scanner", 
    title: "Scanner", 
    icon: ScanLine
  },
  { 
    id: "configuracoes", 
    title: "Configurações", 
    icon: Settings
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
    <Sidebar className={collapsed ? "w-16" : "w-60"}>
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-6 border-b border-sidebar-border">
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
                <h1 className="font-bold text-lg text-sidebar-foreground">REISTOQ</h1>
                <p className="text-xs text-sidebar-foreground/60">Sistema de Estoque</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-3 py-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-all duration-200 text-sm font-medium
                      ${activeTab === item.id 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.title}</span>
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