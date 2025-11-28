'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({ 
  label, 
  value, 
  unit, 
  trend, 
  trendValue,
  icon 
}: MetricCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  return (
    <div className="metric-card relative bg-cyber-surface border border-cyber-border rounded-lg p-4 hover:border-cyber-accent/50 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-cyber-muted text-xs uppercase tracking-wider mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-cyber-text group-hover:text-cyber-accent transition-colors">
              {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
            </span>
            {unit && <span className="text-cyber-muted text-sm">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className="text-cyber-accent/50 group-hover:text-cyber-accent transition-colors">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`mt-2 text-xs ${trendColors[trend]} flex items-center gap-1`}>
          <span>{trendIcons[trend]}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

