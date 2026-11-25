'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Flame,
  OctagonAlert,
  ShieldAlert,
} from 'lucide-react';
import type { AqiBandInfo } from '@/lib/types';

interface AqiBandIconProps {
  band: AqiBandInfo;
  className?: string;
}

export function AqiBandIcon({ band, className = 'h-5 w-5 shrink-0' }: AqiBandIconProps) {
  switch (band.symbol) {
    case 'circle':
      return <CheckCircle2 className={className} style={{ color: band.hex }} aria-hidden="true" />;
    case 'half':
      return <CircleDot className={className} style={{ color: band.hex }} aria-hidden="true" />;
    case 'triangle':
      return <AlertTriangle className={className} style={{ color: band.hex }} aria-hidden="true" />;
    case 'shield':
      return <ShieldAlert className={className} style={{ color: band.hex }} aria-hidden="true" />;
    case 'octagon':
      return <OctagonAlert className={className} style={{ color: band.hex }} aria-hidden="true" />;
    case 'hazard':
      return <Flame className={className} style={{ color: band.hex }} aria-hidden="true" />;
  }
}
