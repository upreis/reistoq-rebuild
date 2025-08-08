import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { Dashboard } from '@/components/pages/Dashboard';
import { Pedidos } from '@/components/pages/Pedidos';
import { Estoque } from '@/components/pages/Estoque';
import { Scanner } from '@/components/pages/Scanner';
import { Historico } from '@/components/pages/Historico';
import { Configuracoes } from '@/components/pages/Configuracoes';
import DePara from '@/components/pages/DePara';


interface MainLayoutProps {
  children?: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
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
    </SidebarProvider>
  );
}