import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import reistoqLogoLight from '@/assets/reistoq-logo-light.png';
import reistoqLogoDark from '@/assets/reistoq-logo-dark.png';
import reistoqIcon from '@/assets/reistoq-icon.png';

interface ReistoqLogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: 'full' | 'icon';
}

export function ReistoqLogo({ className = "", width = 140, height = 40, variant = 'full' }: ReistoqLogoProps) {
  // Use the correct logo from the system
  return (
    <img 
      src="/lovable-uploads/78a28708-1e34-459a-b347-1c12a0b5b9e7.png"
      alt="REISTOQ - Sistema de Gestão de Estoque"
      width={width} 
      height={height} 
      className={`transition-smooth hover:scale-105 object-contain ${className}`}
      draggable={false}
    />
  );
}