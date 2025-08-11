import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

export function formatarData(data: string | Date): string {
  if (typeof data === 'string') {
    // Evitar problemas de timezone ao formatar datas no formato YYYY-MM-DD
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}/${mes}/${ano}`;
    }
  }
  const date = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatarNumero(numero: number): string {
  return new Intl.NumberFormat('pt-BR').format(numero);
}

// Converte para o formato esperado pelo Tiny (DD/MM/YYYY)
// Aceita Date, 'DD/MM/YYYY', 'YYYY-MM-DD' ou 'YYYY/MM/DD'
export function toTinyDate(input?: string | Date): string {
  if (!input) return '';
  if (input instanceof Date) {
    const dd = String(input.getDate()).padStart(2, '0');
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const yyyy = String(input.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  const s = String(input).trim();
  if (s.includes('/')) {
    // Already DD/MM/YYYY or YYYY/MM/DD
    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const yyyymmddSlash = /^(\d{4})\/(\d{2})\/(\d{2})$/;
    if (ddmmyyyy.test(s)) return s;
    const m = s.match(yyyymmddSlash);
    if (m) {
      const [, yyyy, mm, dd] = m;
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  // Handle YYYY-MM-DD
  const yyyymmddDash = /^(\d{4})-(\d{2})-(\d{2})$/;
  const m = s.match(yyyymmddDash);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }
  return s; // fallback sem alterar
}
