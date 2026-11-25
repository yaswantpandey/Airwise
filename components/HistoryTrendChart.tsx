'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildHistoryTooltipMetrics, getAqiBand } from '@/lib/air-quality';
import type { DailyHistoryPoint, LanguageCode } from '@/lib/types';
import { AqiCategoryIcon } from './AqiCategoryIcon';

export type HistoryChartMode = 'combined' | 'aqi' | 'pm25';

interface HistoryTrendChartProps {
  data: DailyHistoryPoint[];
  mode: HistoryChartMode;
  threshold: number;
  language: LanguageCode;
}

interface EnrichedHistoryPoint extends DailyHistoryPoint {
  prevPoint: DailyHistoryPoint | null;
}

interface CustomTooltipPayloadItem {
  payload?: EnrichedHistoryPoint;
}

function formatSignedNumber(val: number, suffix = ''): string {
  if (val > 0) return `+${val}${suffix}`;
  return `${val}${suffix}`;
}

function HistoryTooltip({
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
      {/* Date & Color-Blind-Safe Air Category Header */}
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
          style={{ color: band.hex === '#881337' ? '#F472B6' : band.hex === '#7E22CE' ? '#C084FC' : band.hex === '#BE123C' ? '#FDA4AF' : band.hex === '#C2410C' ? '#FDBA74' : band.hex === '#B45309' ? '#FCD34D' : '#5EEAD4' }}
        >
          <AqiCategoryIcon symbol={band.symbol} className="h-3.5 w-3.5 shrink-0" />
          <span>{isHi ? band.labelHi : band.labelEn}</span>
        </span>
      </div>

      {/* Exact Primary Values: US AQI & PM2.5 */}
      <div className="mt-2.5 grid grid-cols-2 gap-3 border-b border-slate-800 pb-2.5">
        <div>
          <p className="text-[11px] text-slate-400">
            {isHi ? 'औसत US AQI' : 'Avg US AQI'}
          </p>
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
          <p className="text-[11px] text-slate-400">
            {isHi ? 'औसत PM2.5' : 'Avg PM2.5'}
          </p>
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

      {/* Contextual Threshold & WHO Guideline Footer */}
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

export function HistoryTrendChart({
  data,
  mode,
  threshold,
  language,
}: HistoryTrendChartProps) {
  const isHi = language === 'hi';
  const count = data.length;
  const xInterval = count > 24 ? Math.max(2, Math.floor(count / 7)) : count > 10 ? 1 : 0;
  const showDots = count <= 14;
  const combinedBarSize = count > 24 ? 14 : count > 12 ? 22 : 38;
  const pmBarSize = count > 24 ? 16 : count > 12 ? 26 : 44;

  const enrichedData = useMemo<EnrichedHistoryPoint[]>(
    () =>
      data.map((point, index) => ({
        ...point,
        prevPoint: index > 0 ? data[index - 1] : null,
      })),
    [data]
  );

  if (mode === 'combined') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={enrichedData} margin={{ top: 14, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#94A3B8"
            strokeOpacity={0.22}
            vertical={false}
          />
          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
            interval={xInterval}
          />
          <YAxis
            yAxisId="aqi"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <YAxis
            yAxisId="pm25"
            orientation="right"
            tick={{ fontSize: 11, fill: '#0F766E' }}
            tickLine={false}
            axisLine={false}
            width={44}
            unit="µg"
          />
          <Tooltip
            offset={16}
            cursor={{ stroke: '#0F766E', strokeWidth: 1.5, strokeDasharray: '3 3' }}
            content={<HistoryTooltip threshold={threshold} language={language} />}
          />
          <ReferenceLine
            yAxisId="aqi"
            y={threshold}
            stroke="#0F766E"
            strokeDasharray="4 4"
            label={{
              value: isHi ? `सीमा ${threshold}` : `Limit ${threshold}`,
              position: 'insideTopRight',
              fill: '#0F766E',
              fontSize: 11,
            }}
          />
          <Bar
            yAxisId="pm25"
            dataKey="avgPm25"
            name={isHi ? 'औसत PM2.5 (µg/m³)' : 'Avg PM2.5 (µg/m³)'}
            fill="#0D9488"
            fillOpacity={0.32}
            stroke="#0F766E"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
            maxBarSize={combinedBarSize}
            isAnimationActive={false}
          />
          <Line
            yAxisId="aqi"
            type="monotone"
            dataKey="avgAqi"
            name={isHi ? 'औसत US AQI' : 'Avg US AQI'}
            stroke="#BE123C"
            strokeWidth={2.5}
            dot={showDots ? { r: 4, fill: '#BE123C', stroke: '#FFFFFF', strokeWidth: 1.5 } : false}
            activeDot={{ r: 6, fill: '#BE123C', stroke: '#FFFFFF', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  if (mode === 'aqi') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={enrichedData} margin={{ top: 14, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="airwiseHistoryAvgAqi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#BE123C" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#BE123C" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="airwiseHistoryPeakAqi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#94A3B8"
            strokeOpacity={0.22}
            vertical={false}
          />
          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
            interval={xInterval}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            offset={16}
            cursor={{ stroke: '#0F766E', strokeWidth: 1.5, strokeDasharray: '3 3' }}
            content={<HistoryTooltip threshold={threshold} language={language} />}
          />
          <ReferenceLine
            y={threshold}
            stroke="#0F766E"
            strokeDasharray="4 4"
            label={{
              value: isHi ? `व्यक्तिगत सीमा ${threshold}` : `Personal limit ${threshold}`,
              position: 'insideTopRight',
              fill: '#0F766E',
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="maxAqi"
            name={isHi ? 'अधिकतम AQI' : 'Peak AQI'}
            stroke="#64748B"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#airwiseHistoryPeakAqi)"
            activeDot={{ r: 4.5, fill: '#64748B', stroke: '#FFFFFF', strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="avgAqi"
            name={isHi ? 'औसत AQI' : 'Avg AQI'}
            stroke="#BE123C"
            strokeWidth={2.5}
            fill="url(#airwiseHistoryAvgAqi)"
            dot={showDots ? { r: 3.5, fill: '#BE123C', stroke: '#FFFFFF', strokeWidth: 1.5 } : false}
            activeDot={{ r: 6, fill: '#BE123C', stroke: '#FFFFFF', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={enrichedData} margin={{ top: 14, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#94A3B8"
          strokeOpacity={0.22}
          vertical={false}
        />
        <XAxis
          dataKey="dayLabel"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={false}
          interval={xInterval}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={false}
          width={44}
          unit="µg"
        />
        <Tooltip
          offset={16}
          cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
          content={<HistoryTooltip threshold={threshold} language={language} />}
        />
        <ReferenceLine
          y={15}
          stroke="#0F766E"
          strokeDasharray="4 4"
          label={{
            value: isHi ? 'WHO 24h (15 µg/m³)' : 'WHO 24h (15 µg/m³)',
            position: 'insideTopRight',
            fill: '#0F766E',
            fontSize: 11,
          }}
        />
        <Bar
          dataKey="avgPm25"
          name={isHi ? 'औसत PM2.5 (µg/m³)' : 'Avg PM2.5 (µg/m³)'}
          radius={[5, 5, 0, 0]}
          maxBarSize={pmBarSize}
          isAnimationActive={false}
        >
          {enrichedData.map((entry) => (
            <Cell
              key={entry.dateIso}
              fill={getAqiBand(entry.avgAqi).hex}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
