'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { BenchmarkResult } from '@/lib/types';

interface ThroughputLatencyChartProps {
  data: BenchmarkResult[];
  xMetric: 'tputPerGpu' | 'outputTputPerGpu' | 'inputTputPerGpu';
  yMetric: 'ttft' | 'tpot' | 'e2el';
  colorBy: 'framework' | 'hardware' | 'precision';
}

const COLORS = {
  framework: {
    'DYNAMO-TRTLLM': '#00ff9d',
    'DYNAMO-SGLANG': '#06b6d4',
    'SGLANG': '#f59e0b',
    'VLLM': '#ef4444',
    'default': '#8b5cf6'
  },
  hardware: {
    'GB200': '#00ff9d',
    'B200': '#06b6d4',
    'H100': '#f59e0b',
    'A100': '#ef4444',
    'default': '#8b5cf6'
  },
  precision: {
    'FP4': '#00ff9d',
    'FP8': '#06b6d4',
    'FP16': '#f59e0b',
    'INT8': '#ef4444',
    'default': '#8b5cf6'
  }
};

const METRIC_LABELS: Record<string, string> = {
  tputPerGpu: 'Total Throughput per GPU (tok/s)',
  outputTputPerGpu: 'Output Throughput per GPU (tok/s)',
  inputTputPerGpu: 'Input Throughput per GPU (tok/s)',
  ttft: 'Time to First Token (ms)',
  tpot: 'Time per Output Token (ms)',
  e2el: 'End-to-End Latency (s)'
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BenchmarkResult }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip bg-cyber-surface/95 border border-cyber-accent rounded-lg p-3 shadow-lg">
        <p className="text-cyber-accent font-semibold mb-2">{data.model}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-cyber-muted">Hardware:</span>
          <span className="text-cyber-text">{data.hardware}</span>
          <span className="text-cyber-muted">Framework:</span>
          <span className="text-cyber-text">{data.framework}</span>
          <span className="text-cyber-muted">Precision:</span>
          <span className="text-cyber-text">{data.precision}</span>
          <span className="text-cyber-muted">TP/EP:</span>
          <span className="text-cyber-text">{data.tp}/{data.ep}</span>
          <span className="text-cyber-muted">Concurrency:</span>
          <span className="text-cyber-text">{data.concurrency}</span>
          <div className="col-span-2 border-t border-cyber-border my-1"></div>
          <span className="text-cyber-muted">TTFT:</span>
          <span className="text-cyber-text">{data.ttft.toFixed(2)} ms</span>
          <span className="text-cyber-muted">TPOT:</span>
          <span className="text-cyber-text">{data.tpot.toFixed(2)} ms</span>
          <span className="text-cyber-muted">Throughput:</span>
          <span className="text-cyber-text">{data.tputPerGpu.toFixed(2)} tok/s</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ThroughputLatencyChart({
  data,
  xMetric,
  yMetric,
  colorBy
}: ThroughputLatencyChartProps) {
  // Group data by color category
  const groupedData = data.reduce((acc, item) => {
    const key = String(item[colorBy]);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, BenchmarkResult[]>);

  const colorMap = COLORS[colorBy];

  return (
    <div className="w-full h-[500px] bg-cyber-surface border border-cyber-border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-cyber-text">
          {METRIC_LABELS[xMetric]} vs {METRIC_LABELS[yMetric]}
        </h3>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis 
            dataKey={xMetric}
            type="number"
            name={METRIC_LABELS[xMetric]}
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            label={{ 
              value: METRIC_LABELS[xMetric], 
              position: 'bottom', 
              offset: 40,
              fill: '#9ca3af',
              fontSize: 12
            }}
          />
          <YAxis 
            dataKey={yMetric}
            type="number"
            name={METRIC_LABELS[yMetric]}
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            label={{ 
              value: METRIC_LABELS[yMetric], 
              angle: -90, 
              position: 'insideLeft',
              offset: -45,
              fill: '#9ca3af',
              fontSize: 12
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>}
          />
          {Object.entries(groupedData).map(([key, items]) => (
            <Scatter
              key={key}
              name={key}
              data={items}
              fill={colorMap[key as keyof typeof colorMap] || colorMap.default}
              fillOpacity={0.8}
            />
          ))}
          <ReferenceLine y={0} stroke="#374151" />
          <ReferenceLine x={0} stroke="#374151" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

