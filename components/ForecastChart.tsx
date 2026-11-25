'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ForecastChartPoint {
  axisLabel: string;
  aqi: number;
  pm25: number;
}

interface ForecastChartProps {
  data: ForecastChartPoint[];
  chartMetric: 'aqi' | 'pm25';
  horizon: '24h' | '48h';
  threshold: number;
  bandHex: string;
}

export function ForecastChart({
  data,
  chartMetric,
  horizon,
  threshold,
  bandHex,
}: ForecastChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="airwiseAqiFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={bandHex} stopOpacity={0.28} />
            <stop offset="95%" stopColor={bandHex} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#94A3B8"
          strokeOpacity={0.2}
          vertical={false}
        />
        <XAxis
          dataKey="axisLabel"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={false}
          interval={horizon === '48h' ? 5 : 2}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            fontSize: '12px',
          }}
          formatter={(value: unknown) => [
            chartMetric === 'aqi' ? `${value} AQI` : `${value} µg/m³`,
            chartMetric === 'aqi' ? 'US AQI' : 'PM2.5',
          ]}
        />
        {chartMetric === 'aqi' && (
          <ReferenceLine
            y={threshold}
            stroke="#0F766E"
            strokeDasharray="4 4"
            label={{
              value: `Alert ${threshold}`,
              position: 'insideTopRight',
              fill: '#0F766E',
              fontSize: 11,
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey={chartMetric}
          stroke={bandHex}
          strokeWidth={2}
          fill="url(#airwiseAqiFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
