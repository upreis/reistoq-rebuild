import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { Dashboard } from '@/components/pages/Dashboard';
import { Pedidos } from '@/components/pages/Pedidos';
import { Estoque } from '@/components/pages/Estoque';
import { Scanner } from '@/components/pages/Scanner';
import { Historico } from '@/components/pages/Historico';
import { Configuracoes } from '@/components/pages/Configuracoes';
import DePara from '@/components/pages/DePara';
import { AnnouncementTicker } from '@/components/notifications/AnnouncementTicker';
import { useAnnouncementTicker } from '@/hooks/useAnnouncementTicker';


interface MainLayoutProps {
  children?: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { props } = useAnnouncementTicker();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background flex-col">
        <section aria-label="Avisos do sistema" className="w-full">
          <AnnouncementTicker
            {...props}
            sticky={true}
            showPause={false}
            showCollapse={true}
            edgeToEdge
            variant="plain"
            mode="continuous"
            speed={35}
            dir="rtl"
            className="bg-white border-b"
          />
        </section>
        <SidebarStateBodySync />
        <div className="flex w-full flex-1">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 p-6 overflow-auto">

              {children || (
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/estoque" element={<Estoque />} />
                  <Route path="/pedidos" element={<Pedidos />} />
                  <Route path="/depara" element={<DePara />} />
                  <Route path="/scanner" element={<Scanner />} />
                  <Route path="/historico" element={<Historico />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                </Routes>
              )}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}

function SidebarStateBodySync() {
  const { state, isMobile } = useSidebar();
  React.useEffect(() => {
    const body = document.body;
    body.classList.toggle('sidebar-open', state === 'expanded' && !isMobile);
    body.classList.toggle('sidebar-closed', state !== 'expanded' || isMobile);
  }, [state, isMobile]);
  return null;
}