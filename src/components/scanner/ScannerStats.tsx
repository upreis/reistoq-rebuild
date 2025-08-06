import { TrendingUp, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScanHistory {
  codigo: string;
  produto?: string;
  found: boolean;
  timestamp: Date;
}

interface ScannerStatsProps {
  scanHistory: ScanHistory[];
}

export function ScannerStats({ scanHistory }: ScannerStatsProps) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const todayScans = scanHistory.filter(scan => new Date(scan.timestamp) >= startOfToday);
  const weekScans = scanHistory.filter(scan => new Date(scan.timestamp) >= startOfWeek);
  
  const todaySuccess = todayScans.filter(scan => scan.found).length;
  const weekSuccess = weekScans.filter(scan => scan.found).length;
  
  const successRate = scanHistory.length > 0 ? 
    Math.round((scanHistory.filter(scan => scan.found).length / scanHistory.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hoje</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayScans.length}</div>
          <p className="text-xs text-muted-foreground">
            {todaySuccess} encontrados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{weekScans.length}</div>
          <p className="text-xs text-muted-foreground">
            {weekSuccess} encontrados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          {successRate >= 80 ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-yellow-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successRate}%</div>
          <p className="text-xs text-muted-foreground">
            {scanHistory.length} total escaneados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}