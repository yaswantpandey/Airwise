'use client';

import { memo, useMemo } from 'react';
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
import { getAqiBand } from '@/lib/air-quality';
import type { DailyHistoryPoint, LanguageCode } from '@/lib/types';
import { HistoryTooltipCard, type EnrichedHistoryPoint } from './HistoryTooltipCard';

export type HistoryChartMode = 'combined' | 'aqi' | 'pm25';

interface HistoryTrendChartProps {
  data: DailyHistoryPoint[];
  mode: HistoryChartMode;
  threshold: number;
  language: LanguageCode;
}

export const HistoryTrendChart = memo(function HistoryTrendChart({
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
            content={<HistoryTooltipCard threshold={threshold} language={language} />}
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
            content={<HistoryTooltipCard threshold={threshold} language={language} />}
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
          content={<HistoryTooltipCard threshold={threshold} language={language} />}
        />
        <ReferenceLine
          y={15}
          stroke="#0F766E"
          strokeDasharray="4 4"
          label={{
            value: 'WHO 24h (15 µg/m³)',
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
});
