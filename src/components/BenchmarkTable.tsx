'use client';

import React, { useState, useMemo } from 'react';
import { BenchmarkResult } from '@/lib/types';

interface BenchmarkTableProps {
  data: BenchmarkResult[];
}

type SortField = keyof BenchmarkResult;
type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortField; label: string; unit?: string; width?: string }[] = [
  { key: 'runDate', label: 'Date', width: 'w-24' },
  { key: 'model', label: 'Model', width: 'w-40' },
  { key: 'hardware', label: 'HW', width: 'w-16' },
  { key: 'framework', label: 'Framework', width: 'w-28' },
  { key: 'precision', label: 'Prec', width: 'w-14' },
  { key: 'tp', label: 'TP' },
  { key: 'concurrency', label: 'Conc' },
  { key: 'ttft', label: 'TTFT', unit: 'ms' },
  { key: 'tpot', label: 'TPOT', unit: 'ms' },
  { key: 'e2el', label: 'E2EL', unit: 's' },
  { key: 'tputPerGpu', label: 'TPUT/GPU', unit: 'tok/s' },
];

export default function BenchmarkTable({ data }: BenchmarkTableProps) {
  const [sortField, setSortField] = useState<SortField>('runDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = data.filter(item => 
        item.model.toLowerCase().includes(term) ||
        item.hardware.toLowerCase().includes(term) ||
        item.framework.toLowerCase().includes(term) ||
        item.precision.toLowerCase().includes(term) ||
        item.runDate.includes(term)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    });

    return showAll ? sorted : sorted.slice(0, 50);
  }, [data, sortField, sortDirection, searchTerm, showAll]);

  const formatValue = (value: unknown, key: SortField): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      if (['ttft', 'tpot', 'e2el', 'interactivity', 'tputPerGpu', 'outputTputPerGpu', 'inputTputPerGpu'].includes(key)) {
        return value.toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
      }
      if (value >= 9999) return 'inf';
      return value.toString();
    }
    return String(value);
  };

  return (
    <div className="bg-[#242424] border border-[#333] rounded-lg overflow-hidden">
      <div className="p-3 border-b border-[#333] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Benchmark Results</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {filteredAndSortedData.length} of {data.length} results
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#333] border border-[#444] rounded px-2 py-1 text-xs text-white
                       focus:outline-none focus:border-blue-500
                       placeholder:text-gray-500 w-40"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#2a2a2a]">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-2 py-2 text-left font-medium text-gray-400 
                             cursor-pointer hover:text-white transition-colors border-b border-[#333]
                             ${col.width || ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.unit && (
                      <span className="text-[10px] text-gray-500">({col.unit})</span>
                    )}
                    {sortField === col.key && (
                      <span className="text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.map((row, idx) => (
              <tr 
                key={`${row.runId}-${idx}`}
                className="border-b border-[#333] hover:bg-[#2a2a2a] transition-colors"
              >
                {COLUMNS.map((col) => {
                  const value = row[col.key];
                  return (
                    <td 
                      key={col.key} 
                      className="px-2 py-1.5 text-gray-300 whitespace-nowrap"
                    >
                      {col.key === 'model' ? (
                        <span className="text-blue-400">{formatValue(value, col.key)}</span>
                      ) : col.key === 'runDate' ? (
                        <span className="text-gray-500">{formatValue(value, col.key)}</span>
                      ) : (
                        formatValue(value, col.key)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 50 && !showAll && (
        <div className="p-2 border-t border-[#333] text-center">
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Show all {data.length} results
          </button>
        </div>
      )}
    </div>
  );
}
