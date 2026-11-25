'use client';

import {
  CheckCircle2,
  CircleDot,
  AlertTriangle,
  ShieldAlert,
  OctagonAlert,
  AlertOctagon,
} from 'lucide-react';
import type { AqiBandInfo } from '@/lib/types';

interface AqiSymbolProps {
  band: AqiBandInfo;
  className?: string;
}

export function AqiSymbol({ band, className = 'h-4 w-4 shrink-0' }: AqiSymbolProps) {
  switch (band.symbol) {
    case 'circle':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'half':
      return <CircleDot className={className} aria-hidden="true" />;
    case 'triangle':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'shield':
      return <ShieldAlert className={className} aria-hidden="true" />;
    case 'octagon':
      return <OctagonAlert className={className} aria-hidden="true" />;
    case 'hazard':
      return <AlertOctagon className={className} aria-hidden="true" />;
  }
}
