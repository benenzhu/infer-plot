'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BenchmarkResult } from '@/lib/types';

interface TrendChartProps {
  data: BenchmarkResult[];
  metric: 'tputPerGpu' | 'ttft' | 'tpot' | 'interactivity';
}

const METRIC_CONFIG: Record<string, { label: string; unit: string; color: string }> = {
  tputPerGpu: { label: 'Throughput per GPU', unit: 'tok/s', color: '#00ff9d' },
  ttft: { label: 'Time to First Token', unit: 'ms', color: '#06b6d4' },
  tpot: { label: 'Time per Output Token', unit: 'ms', color: '#f59e0b' },
  interactivity: { label: 'Interactivity', unit: 'tok/s/user', color: '#8b5cf6' }
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-cyber-surface/95 border border-cyber-accent rounded-lg p-3 shadow-lg">
        <p className="text-cyber-muted text-xs mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.dataKey === 'value' ? '#00ff9d' : '#06b6d4' }}>
            {entry.value?.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TrendChart({ data, metric }: TrendChartProps) {
  const config = METRIC_CONFIG[metric];

  // Aggregate data by date
  const aggregatedData = data.reduce((acc, item) => {
    const date = item.runDate || 'Unknown';
    if (!acc[date]) {
      acc[date] = { values: [], date };
    }
    acc[date].values.push(item[metric] as number);
    return acc;
  }, {} as Record<string, { values: number[]; date: string }>);

  // Calculate average for each date
  const chartData = Object.values(aggregatedData)
    .map(({ date, values }) => ({
      date,
      value: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="w-full h-[300px] bg-cyber-surface border border-cyber-border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-cyber-text">
          {config.label} Trend
        </h3>
        <span className="text-xs text-cyber-muted">{config.unit}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={(value) => <span style={{ color: '#e5e7eb', fontSize: 12 }}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={config.label}
            stroke={config.color}
            strokeWidth={2}
            dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: config.color, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

