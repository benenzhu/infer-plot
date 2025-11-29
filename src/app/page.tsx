'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { BenchmarkResult, FilterState } from '@/lib/types';
import MultiSelect from '@/components/MultiSelect';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import BenchmarkTable from '@/components/BenchmarkTable';

// Date range options
const DATE_RANGES = [
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
  { label: 'All', days: 365 },
];

// Workflow options
const WORKFLOWS = [
  { label: '1k/1k', value: 'full-sweep-1k1k-scheduler.yml' },
  { label: '1k/8k', value: 'full-sweep-1k8k-scheduler.yml' },
  { label: '8k/1k', value: 'full-sweep-8k1k-scheduler.yml' },
];

// Helper to parse array from URL param
function parseArrayParam(param: string | null): string[] {
  if (!param) return [];
  return param.split(',').filter(Boolean);
}

// Helper to encode array to URL param
function encodeArrayParam(arr: string[]): string | null {
  if (arr.length === 0) return null;
  return arr.join(',');
}

// Main page component with Suspense wrapper
export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runsCount, setRunsCount] = useState(0);
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; cacheAge?: number } | null>(null);

  // Initialize state from URL params
  const getInitialFilters = useCallback((): FilterState => ({
    model: parseArrayParam(searchParams.get('model')),
    hardware: parseArrayParam(searchParams.get('hardware')),
    framework: parseArrayParam(searchParams.get('framework')),
    precision: parseArrayParam(searchParams.get('precision')),
    tp: parseArrayParam(searchParams.get('tp')),
    concurrency: parseArrayParam(searchParams.get('concurrency')),
  }), [searchParams]);

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);

  const [dateRange, setDateRange] = useState(() => {
    const days = searchParams.get('days');
    return days ? parseInt(days) : 365;
  });
  
  const [workflow, setWorkflow] = useState(() => {
    return searchParams.get('workflow') || 'full-sweep-1k1k-scheduler.yml';
  });
  
  const [granularity, setGranularity] = useState<'day' | 'commit'>(() => {
    const g = searchParams.get('granularity');
    return g === 'commit' ? 'commit' : 'day';
  });

  // Update URL when state changes
  const updateURL = useCallback((newFilters: FilterState, newDateRange: number, newWorkflow: string, newGranularity: 'day' | 'commit') => {
    const params = new URLSearchParams();
    
    // Add workflow if not default
    if (newWorkflow !== 'full-sweep-1k1k-scheduler.yml') {
      params.set('workflow', newWorkflow);
    }
    
    // Add date range if not default
    if (newDateRange !== 365) {
      params.set('days', String(newDateRange));
    }
    
    // Add granularity if not default
    if (newGranularity !== 'day') {
      params.set('granularity', newGranularity);
    }
    
    // Add filters
    const filterKeys: (keyof FilterState)[] = ['model', 'hardware', 'framework', 'precision', 'tp', 'concurrency'];
    for (const key of filterKeys) {
      const encoded = encodeArrayParam(newFilters[key]);
      if (encoded) {
        params.set(key, encoded);
      }
    }
    
    const queryString = params.toString();
    const newURL = queryString ? `${pathname}?${queryString}` : pathname;
    
    // Use replaceState to avoid adding to browser history for every change
    router.replace(newURL, { scroll: false });
  }, [pathname, router]);

  // Track current fetch to prevent duplicates
  const fetchKeyRef = useRef<string | null>(null);

  // Force refresh data (bypass server cache)
  const forceRefresh = useCallback(async () => {
    const key = `${workflow}_${dateRange}_refresh_${Date.now()}`;
    fetchKeyRef.current = key;
    
    setLoading(true);
    setError(null);
    setCacheInfo(null);
    
    try {
      const res = await fetch(`/api/benchmarks?days=${dateRange}&workflow=${workflow}&refresh=true`);
      const json = await res.json();
      
      // Check if this is still the current request
      if (fetchKeyRef.current !== key) return;
      
      if (json.error) {
        setError(json.error);
        setBenchmarkData([]);
      } else {
        setBenchmarkData(json.data || []);
        setRunsCount(json.runsCount || 0);
        setCacheInfo({ cached: false });
      }
    } catch (err) {
      if (fetchKeyRef.current !== key) return;
      setError('Failed to fetch data');
      setBenchmarkData([]);
    } finally {
      if (fetchKeyRef.current === key) {
        setLoading(false);
      }
    }
  }, [dateRange, workflow]);

  // Fetch data from API (server handles caching)
  useEffect(() => {
    const key = `${workflow}_${dateRange}`;
    
    // Skip if we're already fetching this exact data
    if (fetchKeyRef.current === key) {
      return;
    }
    fetchKeyRef.current = key;

    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/benchmarks?days=${dateRange}&workflow=${workflow}`);
        const json = await res.json();
        
        // Check if this is still the current request
        if (fetchKeyRef.current !== key) return;
        
        if (json.error) {
          setError(json.error);
          setBenchmarkData([]);
        } else {
          setBenchmarkData(json.data || []);
          setRunsCount(json.runsCount || 0);
          setCacheInfo({ 
            cached: json.cached || false, 
            cacheAge: json.cacheAge 
          });
        }
      } catch (err) {
        if (fetchKeyRef.current !== key) return;
        setError('Failed to fetch data');
        setBenchmarkData([]);
      } finally {
        if (fetchKeyRef.current === key) {
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [dateRange, workflow]);

  // Get unique values for filters
  const getUniqueValues = (field: keyof BenchmarkResult): string[] => {
    const values = new Set<string>();
    benchmarkData.forEach(d => {
      const val = d[field];
      if (val !== undefined && val !== null && val !== '') {
        values.add(String(val));
      }
    });
    return Array.from(values).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  };

  // Filter data - now supports multiple selections
  const filteredData = useMemo(() => {
    return benchmarkData.filter(item => {
      if (filters.model.length > 0 && !filters.model.includes(item.model)) return false;
      if (filters.hardware.length > 0 && !filters.hardware.includes(item.hardware)) return false;
      if (filters.framework.length > 0 && !filters.framework.includes(item.framework)) return false;
      if (filters.precision.length > 0 && !filters.precision.includes(item.precision)) return false;
      if (filters.tp.length > 0 && !filters.tp.includes(String(item.tp))) return false;
      if (filters.concurrency.length > 0 && !filters.concurrency.includes(String(item.concurrency))) return false;
      return true;
    });
  }, [benchmarkData, filters]);

  // Get stats
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const dates = filteredData.map(d => d.runDate).filter(Boolean);
    const latestDate = dates.length > 0 ? dates.sort().reverse()[0] : 'N/A';
    
    return {
      totalRuns: runsCount,
      configCount: new Set(filteredData.map(d => 
        `${d.model}|${d.hardware}|${d.framework}|${d.precision}|${d.tp}|${d.concurrency}`
      )).size,
      dataPoints: filteredData.length,
      latestDate
    };
  }, [filteredData, runsCount]);

  const updateFilter = (key: keyof FilterState, values: string[]) => {
    const newFilters = { ...filters, [key]: values };
    setFilters(newFilters);
    updateURL(newFilters, dateRange, workflow, granularity);
  };

  const clearFilters = () => {
    const newFilters = {
      model: [],
      hardware: [],
      framework: [],
      precision: [],
      tp: [],
      concurrency: [],
    };
    setFilters(newFilters);
    updateURL(newFilters, dateRange, workflow, granularity);
  };
  
  // Wrappers to update URL when changing other states
  const handleDateRangeChange = (days: number) => {
    setDateRange(days);
    updateURL(filters, days, workflow, granularity);
  };
  
  const handleWorkflowChange = (w: string) => {
    setWorkflow(w);
    updateURL(filters, dateRange, w, granularity);
  };
  
  const handleGranularityChange = (g: 'day' | 'commit') => {
    setGranularity(g);
    updateURL(filters, dateRange, workflow, g);
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(arr => arr.length > 0).length;
  
  // Copy link state
  const [copied, setCopied] = useState(false);
  
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Header */}
      <header className="bg-[#242424] border-b border-[#333] sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-white">InferenceMAX</span>
              <span className="text-xs text-gray-400 bg-[#333] px-2 py-0.5 rounded">
                Benchmark Dashboard
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={copyLink}
                className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  copied 
                    ? 'bg-green-600/20 text-green-400 border border-green-600/50' 
                    : 'bg-[#333] text-gray-400 hover:bg-[#444] hover:text-white'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Share Link
                  </>
                )}
              </button>
              <a 
                href="https://github.com/InferenceMAX/InferenceMAX"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a 
                href="https://inferencemax.semianalysis.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Official Site
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="bg-[#242424] border-b border-[#333] px-4 py-2">
        <div className="max-w-[1800px] mx-auto text-sm text-gray-400">
          Real-time data from{' '}
          <a href="https://github.com/InferenceMAX/InferenceMAX/actions" className="text-blue-400 hover:underline">
            InferenceMAX GitHub Actions
          </a>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto px-4 py-4">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4 text-red-400">
            <strong>Error:</strong> {error}
            {error.includes('GITHUB_TOKEN') && (
              <p className="mt-2 text-sm">
                Please set GITHUB_TOKEN in .env.local file. See README for instructions.
              </p>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-[#242424] border border-[#333] rounded-lg p-4 mb-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Workflow */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Workflow</label>
              <div className="flex gap-1">
                {WORKFLOWS.map(w => (
                  <button
                    key={w.value}
                    onClick={() => handleWorkflowChange(w.value)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      workflow === w.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#333] text-gray-400 hover:bg-[#444]'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Time Range</label>
              <div className="flex gap-1">
                {DATE_RANGES.map(range => (
                  <button
                    key={range.days}
                    onClick={() => handleDateRangeChange(range.days)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      dateRange === range.days
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#333] text-gray-400 hover:bg-[#444]'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Granularity */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Granularity</label>
              <div className="flex gap-1">
                <button
                  onClick={() => handleGranularityChange('day')}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    granularity === 'day'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#333] text-gray-400 hover:bg-[#444]'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => handleGranularityChange('commit')}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    granularity === 'commit'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#333] text-gray-400 hover:bg-[#444]'
                  }`}
                >
                  Commit
                </button>
              </div>
            </div>

            <div className="h-8 w-px bg-[#333]" />

            {/* Multi-Select Filters */}
            <MultiSelect
              label="Model"
              values={filters.model}
              options={getUniqueValues('model')}
              onChange={(v) => updateFilter('model', v)}
            />
            <MultiSelect
              label="Hardware"
              values={filters.hardware}
              options={getUniqueValues('hardware')}
              onChange={(v) => updateFilter('hardware', v)}
            />
            <MultiSelect
              label="Framework"
              values={filters.framework}
              options={getUniqueValues('framework')}
              onChange={(v) => updateFilter('framework', v)}
            />
            <MultiSelect
              label="Precision"
              values={filters.precision}
              options={getUniqueValues('precision')}
              onChange={(v) => updateFilter('precision', v)}
            />
            <MultiSelect
              label="TP"
              values={filters.tp}
              options={getUniqueValues('tp')}
              onChange={(v) => updateFilter('tp', v)}
            />
            <MultiSelect
              label="Concurrency"
              values={filters.concurrency}
              options={getUniqueValues('concurrency')}
              onChange={(v) => updateFilter('concurrency', v)}
            />

            <button
              onClick={clearFilters}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                activeFilterCount > 0
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/50'
                  : 'bg-[#333] text-gray-400 hover:bg-[#444]'
              }`}
            >
              Clear {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#333] text-xs text-gray-400">
            <div className="flex gap-6">
              {loading === true ? (
                <span className="text-yellow-400">Loading data...</span>
              ) : stats ? (
                <>
                  <span>
                    <span className="text-gray-500">Runs:</span>{' '}
                    <span className="text-white">{stats.totalRuns}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Configs:</span>{' '}
                    <span className="text-white">{stats.configCount}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Data Points:</span>{' '}
                    <span className="text-white">{stats.dataPoints}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Latest:</span>{' '}
                    <span className="text-white">{stats.latestDate}</span>
                  </span>
                  {cacheInfo?.cached && (
                    <span className="text-green-400">
                      ✓ Cached {cacheInfo.cacheAge ? `(${cacheInfo.cacheAge}m ago)` : ''}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-500">No data available</span>
              )}
            </div>
            {loading === false && (
              <button
                onClick={forceRefresh}
                className="px-3 py-1 text-xs bg-[#333] text-gray-400 hover:bg-[#444] hover:text-white rounded transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading === true && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Fetching benchmark data from GitHub...</p>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        {loading === false && filteredData.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <TimeSeriesChart
                data={filteredData}
                metric="e2el"
                title="Latency (s)"
                unit="s"
              />
              <TimeSeriesChart
                data={filteredData}
                metric="interactivity"
                title="Median ITL (ms)"
                unit="ms"
              />
              <TimeSeriesChart
                data={filteredData}
                metric="tpot"
                title="Output Speed (tok/s)"
                unit="tok/s"
                transform={(ms) => 1000 / ms}
              />
              <TimeSeriesChart
                data={filteredData}
                metric="ttft"
                title="Median TTFT (ms)"
                unit="ms"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <TimeSeriesChart
                data={filteredData}
                metric="tputPerGpu"
                title="Throughput per GPU (tok/s)"
                unit="tok/s"
              />
              <div className="bg-[#242424] border border-[#333] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Configuration Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-[#333]">
                    <span className="text-gray-500">Models</span>
                    <span className="text-white">{new Set(filteredData.map(d => d.model)).size}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#333]">
                    <span className="text-gray-500">Hardware</span>
                    <span className="text-white">{new Set(filteredData.map(d => d.hardware)).size}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#333]">
                    <span className="text-gray-500">Frameworks</span>
                    <span className="text-white">{new Set(filteredData.map(d => d.framework)).size}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#333]">
                    <span className="text-gray-500">Unique Runs</span>
                    <span className="text-white">{new Set(filteredData.map(d => d.runId)).size}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <BenchmarkTable data={filteredData} />
          </>
        )}

        {/* Empty State */}
        {loading === false && filteredData.length === 0 && !error && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No benchmark data found</p>
            <p className="text-sm">Try adjusting the filters or time range</p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 py-4 border-t border-[#333] text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <div>
              Data source:{' '}
              <a 
                href="https://github.com/InferenceMAX/InferenceMAX/actions"
                className="text-blue-400 hover:underline"
                target="_blank"
              >
                InferenceMAX GitHub Actions
              </a>
            </div>
            <div className="flex gap-4">
              <a 
                href="https://inferencemax.semianalysis.com/"
                className="hover:text-gray-300 transition-colors"
                target="_blank"
              >
                Official Dashboard
              </a>
              <a 
                href="https://semianalysis.com/"
                className="hover:text-gray-300 transition-colors"
                target="_blank"
              >
                SemiAnalysis
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
