'use client';

import { buildHistoryTooltipMetrics, getAqiBand } from '@/lib/air-quality';
import type { DailyHistoryPoint, LanguageCode } from '@/lib/types';
import { AqiCategoryIcon } from './AqiCategoryIcon';

export interface EnrichedHistoryPoint extends DailyHistoryPoint {
  prevPoint: DailyHistoryPoint | null;
}

export interface CustomTooltipPayloadItem {
  payload?: EnrichedHistoryPoint;
}

function formatSignedNumber(val: number, suffix = ''): string {
  if (val > 0) return `+${val}${suffix}`;
  return `${val}${suffix}`;
}

function resolveDarkBadgeHex(bandHex: string): string {
  if (bandHex === '#881337') return '#F472B6';
  if (bandHex === '#7E22CE') return '#C084FC';
  if (bandHex === '#BE123C') return '#FDA4AF';
  if (bandHex === '#C2410C') return '#FDBA74';
  if (bandHex === '#92400E' || bandHex === '#B45309') return '#FCD34D';
  return '#5EEAD4';
}

export function HistoryTooltipCard({
  active,
  payload,
  threshold,
  language,
}: {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  threshold: number;
  language: LanguageCode;
}) {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }

  const point = payload[0].payload;
  const band = getAqiBand(point.avgAqi);
  const metrics = buildHistoryTooltipMetrics(point, point.prevPoint, threshold);
  const isHi = language === 'hi';

  return (
    <div
      data-testid="history-tooltip"
      className="pointer-events-none min-w-[248px] rounded-xl border border-slate-700/90 bg-slate-950/95 p-3.5 text-xs text-slate-100 shadow-xl backdrop-blur-xs"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-2.5">
        <div>
          <p className="font-semibold text-white">
            {point.weekdayLabel}, {point.dayLabel}
          </p>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
            {point.dateIso}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: resolveDarkBadgeHex(band.hex) }}
        >
          <AqiCategoryIcon symbol={band.symbol} className="h-3.5 w-3.5 shrink-0" />
          <span>{isHi ? band.labelHi : band.labelEn}</span>
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-3 border-b border-slate-800 pb-2.5">
        <div>
          <p className="text-[11px] text-slate-400">{isHi ? 'औसत US AQI' : 'Avg US AQI'}</p>
          <div className="mt-0.5 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-lg font-bold text-white" data-testid="tooltip-aqi-value">
              {point.avgAqi}
            </span>
            {metrics.aqiDeltaFromPrev !== null && (
              <span
                className={`text-[11px] font-medium ${
                  metrics.aqiDeltaFromPrev < 0
                    ? 'text-teal-300'
                    : metrics.aqiDeltaFromPrev > 0
                      ? 'text-rose-300'
                      : 'text-slate-400'
                }`}
              >
                {formatSignedNumber(metrics.aqiDeltaFromPrev)}
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
            {isHi
              ? `न्यूनतम ${point.minAqi} · अधिकतम ${point.maxAqi}`
              : `Min ${point.minAqi} · Peak ${point.maxAqi}`}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-slate-400">{isHi ? 'औसत PM2.5' : 'Avg PM2.5'}</p>
          <div className="mt-0.5 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-lg font-bold text-teal-300" data-testid="tooltip-pm25-value">
              {point.avgPm25}
            </span>
            <span className="text-[11px] text-slate-400">µg/m³</span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
            {isHi ? `अधिकतम ${point.maxPm25} µg/m³` : `Peak ${point.maxPm25} µg/m³`}
            {metrics.pm25DeltaFromPrev !== null && (
              <span
                className={`ml-1.5 ${
                  metrics.pm25DeltaFromPrev < 0
                    ? 'text-teal-300'
                    : metrics.pm25DeltaFromPrev > 0
                      ? 'text-rose-300'
                      : 'text-slate-400'
                }`}
              >
                ({formatSignedNumber(metrics.pm25DeltaFromPrev)})
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1 font-mono text-[11px] tabular-nums">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">
            {isHi ? `सीमा (${threshold} AQI)` : `Limit (${threshold} AQI)`}
          </span>
          <span
            className={
              metrics.exceedsThreshold ? 'font-medium text-rose-300' : 'font-medium text-teal-300'
            }
          >
            {metrics.exceedsThreshold
              ? isHi
                ? `+${metrics.thresholdDelta} ऊपर`
                : `+${metrics.thresholdDelta} above`
              : isHi
                ? 'सीमा के भीतर'
                : 'Within limit'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">WHO 24h (15 µg/m³)</span>
          <span className="text-slate-200">
            {metrics.whoMultiple > 1
              ? isHi
                ? `${metrics.whoMultiple}× अधिक`
                : `${metrics.whoMultiple}× guideline`
              : isHi
                ? 'सुरक्षित स्तर'
                : 'Within guideline'}
          </span>
        </div>
      </div>
    </div>
  );
}
