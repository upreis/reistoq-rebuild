import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/components/pages/Dashboard";
import { Pedidos } from "@/components/pages/Pedidos";
import { Estoque } from "@/components/pages/Estoque";
import { DePara } from "@/components/pages/DePara";
import { Historico } from "@/components/pages/Historico";
import { Scanner } from "@/components/pages/Scanner";
import { Configuracoes } from "@/components/pages/Configuracoes";

export function MainLayout() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col">
          <Header />
          
          <main className="flex-1 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7 mb-6">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
                <TabsTrigger value="estoque">Estoque</TabsTrigger>
                <TabsTrigger value="depara">DE/PARA</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="scanner">Scanner</TabsTrigger>
                <TabsTrigger value="configuracoes">Config</TabsTrigger>
              </TabsList>
              
              <div className="min-h-[calc(100vh-12rem)]">
                <TabsContent value="dashboard">
                  <Dashboard />
                </TabsContent>
                <TabsContent value="pedidos">
                  <Pedidos />
                </TabsContent>
                <TabsContent value="estoque">
                  <Estoque />
                </TabsContent>
                <TabsContent value="depara">
                  <DePara />
                </TabsContent>
                <TabsContent value="historico">
                  <Historico />
                </TabsContent>
                <TabsContent value="scanner">
                  <Scanner />
                </TabsContent>
                <TabsContent value="configuracoes">
                  <Configuracoes />
                </TabsContent>
              </div>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}