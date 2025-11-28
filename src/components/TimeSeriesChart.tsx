'use client';

import React, { useMemo, useState } from 'react';
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

interface TimeSeriesChartProps {
  data: BenchmarkResult[];
  metric: 'e2el' | 'ttft' | 'tpot' | 'interactivity' | 'tputPerGpu';
  title: string;
  unit: string;
  height?: number;
  // Optional transform function for values (e.g., ms to tok/s)
  transform?: (value: number) => number;
}

// Extended color palette for 16 lines
const COLORS = [
  '#00ff9d', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316',
  '#84cc16', '#6366f1', '#f43f5e', '#22d3ee',
  '#a855f7', '#eab308', '#10b981', '#3b82f6',
];

// Group data by config
function groupByConfig(data: BenchmarkResult[]): Map<string, BenchmarkResult[]> {
  const groups = new Map<string, BenchmarkResult[]>();
  
  data.forEach(item => {
    if (!item.model || !item.runDate) return;
    const key = `${item.model}|${item.hardware}|${item.framework}|${item.precision}|tp${item.tp}|conc${item.concurrency}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });

  groups.forEach((items, key) => {
    groups.set(key, items.sort((a, b) => a.runDate.localeCompare(b.runDate)));
  });

  return groups;
}

function getShortLabel(item: BenchmarkResult): string {
  if (!item) return 'Unknown';
  const conc = item.concurrency >= 9999 ? 'inf' : item.concurrency;
  // Format: Model | GPU | Framework | tp/conc
  const model = item.model.replace('DeepSeek-R1', 'DSR1').replace('-0528', '');
  return `${model} | ${item.hardware} | ${item.framework} | tp${item.tp}/c${conc}`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    payload: { date: string; runId: string };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload?.length) {
    const valid = payload.filter(p => p.value != null && !isNaN(p.value));
    if (!valid.length) return null;
    
    // Sort by value descending (highest first)
    const sorted = [...valid].sort((a, b) => b.value - a.value);
    
    return (
      <div className="bg-[#242424] border border-[#444] rounded-lg p-3 shadow-lg max-w-md">
        <p className="text-gray-400 text-xs mb-2 font-semibold">{label}</p>
        <div className="space-y-1.5">
          {sorted.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-300 flex-1">{entry.name}</span>
              <span className="text-white font-mono font-semibold">{entry.value?.toFixed(2)}</span>
            </div>
          ))}
        </div>
        {sorted[0]?.payload?.runId && (
          <p className="text-gray-500 text-[10px] mt-2 pt-2 border-t border-[#333]">
            Run: {sorted[0].payload.runId.slice(-8)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function TimeSeriesChart({
  data,
  metric,
  title,
  unit,
  height = 280,
  transform
}: TimeSeriesChartProps) {
  // Track which lines are hidden
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const { chartData, configKeys, configLabels } = useMemo(() => {
    if (!data?.length) return { chartData: [], configKeys: [], configLabels: {} };

    const groups = groupByConfig(data);
    const keys: string[] = [];
    const labels: Record<string, string> = {};
    const dateMap = new Map<string, Record<string, number | string>>();
    
    groups.forEach((items, configKey) => {
      if (!items?.length) return;
      
      keys.push(configKey);
      labels[configKey] = getShortLabel(items[0]);
      
      items.forEach(item => {
        if (!item?.runDate) return;
        let value = item[metric];
        if (value == null || isNaN(value) || value <= 0) return;
        
        // Apply transform if provided (e.g., ms to tok/s)
        if (transform) {
          value = transform(value);
        }
        
        if (!dateMap.has(item.runDate)) {
          dateMap.set(item.runDate, { 
            date: item.runDate,
            runId: item.runId || ''
          });
        }
        dateMap.get(item.runDate)![configKey] = value;
      });
    });

    const sorted = Array.from(dateMap.values())
      .sort((a, b) => (a.date as string).localeCompare(b.date as string));

    return {
      chartData: sorted,
      configKeys: keys.slice(0, 16), // Increased to 16
      configLabels: labels
    };
  }, [data, metric]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  // Handle legend click
  // - Single click: Show only this item
  // - Cmd/Ctrl + click: Toggle this item (add to / remove from selection)
  const handleLegendClick = (dataKey: string, event: React.MouseEvent) => {
    const isMultiSelect = event.metaKey || event.ctrlKey;
    
    setHiddenKeys(prev => {
      if (isMultiSelect) {
        // Cmd/Ctrl + click: Toggle this item
        const next = new Set(prev);
        if (next.has(dataKey)) {
          next.delete(dataKey);
        } else {
          next.add(dataKey);
        }
        return next;
      } else {
        // Single click: Show only this item (hide all others)
        const next = new Set(configKeys.filter(k => k !== dataKey));
        return next;
      }
    });
  };

  // Custom legend with click to toggle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;

    return (
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2">
        {payload.map((entry: { value: string; color?: string; dataKey?: string }, index: number) => {
          const dataKey = entry.dataKey || '';
          const isHidden = hiddenKeys.has(dataKey);
          return (
            <button
              key={`legend-${index}`}
              onClick={(e) => handleLegendClick(dataKey, e)}
              className={`flex items-center gap-1 text-[9px] transition-opacity cursor-pointer hover:opacity-80 ${
                isHidden ? 'opacity-30' : 'opacity-100'
              }`}
              style={{ textDecoration: isHidden ? 'line-through' : 'none' }}
              title="Click: show only this | Cmd/Ctrl+Click: toggle"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color || '#888' }}
              />
              <span className="text-gray-400">{entry.value}</span>
            </button>
          );
        })}
      </div>
    );
  };

  if (!chartData?.length) {
    return (
      <div className="bg-[#242424] border border-[#333] rounded-lg p-4" style={{ height }}>
        <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
        <div className="flex items-center justify-center h-[200px] text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#242424] border border-[#333] rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {hiddenKeys.size > 0 && (
          <button
            onClick={() => setHiddenKeys(new Set())}
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Show All ({hiddenKeys.size} hidden)
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(1)}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            content={renderLegend}
            wrapperStyle={{ paddingTop: '10px' }}
          />
          {configKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={configLabels[key] || key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ fill: COLORS[i % COLORS.length], strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: COLORS[i % COLORS.length] }}
              connectNulls
              hide={hiddenKeys.has(key)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
