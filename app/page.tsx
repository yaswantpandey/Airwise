import { AirWiseApp } from '@/components/AirWiseApp';
import { buildSeedSnapshot, PRESET_CITIES } from '@/lib/seed-data';

export default function HomePage() {
  // Provide instant deterministic SSR snapshot so first paint is immediate even on slow networks;
  // AirWiseApp hydrates with live Open-Meteo AQI right after mount.
  const initialSnapshot = buildSeedSnapshot(PRESET_CITIES[0]);

  return <AirWiseApp initialSnapshot={initialSnapshot} />;
}
