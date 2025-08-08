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
  const { theme } = useTheme();
  
  // Determine which logo to use based on theme and variant
  const getLogoSrc = () => {
    if (variant === 'icon') {
      return reistoqIcon;
    }
    
    // For full logos, check theme
    if (theme === 'dark') {
      return reistoqLogoDark;
    }
    
    return reistoqLogoLight;
  };

  return (
    <img 
      src={getLogoSrc()}
      alt="ReiStoq - Sistema de Gestão de Estoque"
      width={width} 
      height={height} 
      className={`transition-smooth hover:scale-105 ${className}`}
      draggable={false}
    />
  );
}