import { NextResponse } from 'next/server';
import { fetchAllBenchmarkData, fetchWorkflowRuns } from '@/lib/dataFetcher';
import { BenchmarkResult, WorkflowRun } from '@/lib/types';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

// Cache configuration
const CACHE_DURATION_MS = 10 * 60 * 60 * 1000; // 10 hours
const CACHE_DIR = path.join(process.cwd(), '.cache');

interface CacheEntry {
  data: BenchmarkResult[];
  runs: WorkflowRun[];
  timestamp: number;
  workflow: string;
  days: number;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry>();

function getCacheKey(workflow: string, days: number): string {
  return `${workflow}_${days}`;
}

function getCacheFilePath(workflow: string, days: number): string {
  const safeWorkflow = workflow.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(CACHE_DIR, `cache_${safeWorkflow}_${days}.json`);
}

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getFromCache(workflow: string, days: number): CacheEntry | null {
  const key = getCacheKey(workflow, days);
  const now = Date.now();

  // Check memory cache first
  const memCached = memoryCache.get(key);
  if (memCached && (now - memCached.timestamp) < CACHE_DURATION_MS) {
    console.log(`[Cache] Memory cache hit for ${key}`);
    return memCached;
  }

  // Check file cache
  try {
    const filePath = getCacheFilePath(workflow, days);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cached: CacheEntry = JSON.parse(fileContent);
      
      if ((now - cached.timestamp) < CACHE_DURATION_MS) {
        console.log(`[Cache] File cache hit for ${key}`);
        // Restore to memory cache
        memoryCache.set(key, cached);
        return cached;
      } else {
        console.log(`[Cache] File cache expired for ${key}`);
        // Delete expired cache file
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error('[Cache] Error reading file cache:', err);
  }

  return null;
}

function saveToCache(workflow: string, days: number, data: BenchmarkResult[], runs: WorkflowRun[]): void {
  const key = getCacheKey(workflow, days);
  const entry: CacheEntry = {
    data,
    runs,
    timestamp: Date.now(),
    workflow,
    days
  };

  // Save to memory cache
  memoryCache.set(key, entry);
  console.log(`[Cache] Saved to memory cache: ${key} (${data.length} items)`);

  // Save to file cache for persistence
  try {
    ensureCacheDir();
    const filePath = getCacheFilePath(workflow, days);
    fs.writeFileSync(filePath, JSON.stringify(entry));
    console.log(`[Cache] Saved to file cache: ${filePath}`);
  } catch (err) {
    console.error('[Cache] Error writing file cache:', err);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const workflow = searchParams.get('workflow') || 'full-sweep-1k1k-scheduler.yml';
  const forceRefresh = searchParams.get('refresh') === 'true';
  
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({
      error: 'GITHUB_TOKEN not configured',
      data: [],
      runs: []
    }, { status: 401 });
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(workflow, days);
    if (cached) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const recentRuns = cached.runs.filter(r => new Date(r.created_at) >= cutoff);

      return NextResponse.json({
        data: cached.data,
        runs: recentRuns,
        total: cached.data.length,
        runsCount: recentRuns.length,
        workflow,
        cached: true,
        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000 / 60), // minutes
        dateRange: {
          start: cutoff.toISOString(),
          end: new Date().toISOString()
        }
      });
    }
  }

  console.log(`[API] Fetching fresh data from GitHub for ${workflow} (${days} days)`);

  try {
    // Fetch all benchmark data from artifacts
    const benchmarkData = await fetchAllBenchmarkData(token, days, workflow);
    
    // Also get run metadata
    const runs = await fetchWorkflowRuns(workflow, token, days > 60 ? 10 : 5);
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recentRuns = runs.filter(r => new Date(r.created_at) >= cutoff);

    // Save to cache
    saveToCache(workflow, days, benchmarkData, runs);

    return NextResponse.json({
      data: benchmarkData,
      runs: recentRuns,
      total: benchmarkData.length,
      runsCount: recentRuns.length,
      workflow,
      cached: false,
      dateRange: {
        start: cutoff.toISOString(),
        end: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching benchmark data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmark data', details: String(error), data: [], runs: [] },
      { status: 500 }
    );
  }
}
