'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  OctagonAlert,
  ShieldAlert,
  Siren,
} from 'lucide-react';
import type { AqiBandInfo } from '@/lib/types';

export function AqiCategoryIcon({
  symbol,
  className = 'h-4 w-4 shrink-0',
}: {
  symbol: AqiBandInfo['symbol'];
  className?: string;
}) {
  switch (symbol) {
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
      return <Siren className={className} aria-hidden="true" />;
  }
}
