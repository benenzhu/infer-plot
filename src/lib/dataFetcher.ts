import { BenchmarkResult, WorkflowRun } from './types';

const GITHUB_REPO = 'InferenceMAX/InferenceMAX';

// Fetch all successful workflow runs
export async function fetchWorkflowRuns(
  workflowFile: string = 'full-sweep-1k1k-scheduler.yml',
  token: string,
  maxPages: number = 10
): Promise<WorkflowRun[]> {
  const allRuns: WorkflowRun[] = [];
  let page = 1;
  const perPage = 100;

  while (page <= maxPages) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${workflowFile}/runs?status=success&per_page=${perPage}&page=${page}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`
      }
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`);
      break;
    }

    const data = await response.json();
    const runs = data.workflow_runs || [];
    
    if (runs.length === 0) break;

    allRuns.push(...runs.map((run: any) => ({
      id: run.id,
      name: run.name || '',
      created_at: run.created_at,
      conclusion: run.conclusion,
      html_url: run.html_url,
      head_sha: run.head_sha || '',
      run_number: run.run_number
    })));

    if (runs.length < perPage) break;
    page++;
  }

  return allRuns;
}

// Fetch ALL artifacts for a run (with pagination)
export async function fetchAllRunArtifacts(runId: number, token: string): Promise<any[]> {
  const allArtifacts: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}/artifacts?per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${token}`
          }
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch artifacts for run ${runId}: ${response.status}`);
        break;
      }

      const data = await response.json();
      const artifacts = data.artifacts || [];
      
      if (artifacts.length === 0) break;
      
      allArtifacts.push(...artifacts);
      
      if (artifacts.length < perPage) break;
      page++;
    } catch (error) {
      console.error('Error fetching artifacts:', error);
      break;
    }
  }

  return allArtifacts;
}

// Download artifact zip and extract content
export async function downloadArtifact(artifactId: number, token: string): Promise<string | null> {
  try {
    const downloadUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/artifacts/${artifactId}/zip`;
    
    const response = await fetch(downloadUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const files = Object.keys(zip.files);
    
    for (const fileName of files) {
      if (zip.files[fileName].dir) continue;
      const content = await zip.files[fileName].async('string');
      if (content && content.length > 0) {
        return content;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Parse benchmark results - handles JSON format
export function parseBenchmarkResults(
  content: string,
  runDate: string,
  runId: string,
  commitSha: string
): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  
  try {
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      const result = parseJsonItem(item, runDate, runId, commitSha);
      if (result) {
        results.push(result);
      }
    }
  } catch {
    // Not JSON, skip
  }
  
  return results;
}

// Parse JSON item
function parseJsonItem(
  item: any,
  runDate: string,
  runId: string,
  commitSha: string
): BenchmarkResult | null {
  if (!item || !item.model) return null;
  
  const model = extractModelName(item.model);
  if (!model) return null;

  return {
    model,
    hardware: (item.hw || 'Unknown').toUpperCase(),
    framework: (item.framework || 'Unknown').toUpperCase(),
    precision: (item.precision || 'FP16').toUpperCase(),
    isl: item.isl || 1024,
    osl: item.osl || 1024,
    tp: item.tp || 1,
    ep: item.ep || 1,
    dpAttention: item.dp_attention === 'true' || item.dp_attention === true,
    concurrency: item.conc || 1,
    ttft: item.median_ttft || item.mean_ttft || 0,
    tpot: (item.median_tpot || item.mean_tpot || 0) * 1000, // Convert to ms
    interactivity: item.median_intvty || item.mean_intvty || 0,
    e2el: item.median_e2el || item.mean_e2el || 0,
    tputPerGpu: item.tput_per_gpu || 0,
    outputTputPerGpu: item.output_tput_per_gpu || 0,
    inputTputPerGpu: item.input_tput_per_gpu || 0,
    runDate,
    runId,
    commitSha
  };
}

function extractModelName(path: string): string {
  if (!path) return '';
  const parts = path.split('/');
  let name = parts[parts.length - 1] || path;
  
  name = name.replace(/-fp[48].*$/i, '').replace(/-v\d+$/i, '');
  
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('deepseek-r1-0528')) return 'DeepSeek-R1-0528';
  if (lowerName.includes('deepseek')) return 'DeepSeek-R1';
  if (lowerName.includes('gpt-oss') || lowerName.includes('gptoss')) return 'GPT-OSS';
  if (lowerName.includes('gpt')) return 'GPT';
  if (lowerName.includes('llama')) return 'LLaMA';
  if (lowerName.includes('qwen')) return 'Qwen';
  
  return name || 'Unknown';
}

// Process a single run - tries aggregated results first, then individual artifacts
async function processRun(
  run: WorkflowRun,
  token: string
): Promise<BenchmarkResult[]> {
  const runDate = run.created_at.split('T')[0];
  const runId = String(run.id);
  const commitSha = run.head_sha;
  
  console.log(`Processing run ${run.id} (${runDate})`);
  
  // Fetch all artifacts for this run
  const artifacts = await fetchAllRunArtifacts(run.id, token);
  console.log(`  Found ${artifacts.length} total artifacts`);
  
  if (artifacts.length === 0) return [];
  
  // Strategy 1: Look for aggregated results_* artifacts first
  const aggregatedArtifacts = artifacts.filter(a => a.name.startsWith('results_'));
  
  if (aggregatedArtifacts.length > 0) {
    console.log(`  Using ${aggregatedArtifacts.length} aggregated result artifacts`);
    const results: BenchmarkResult[] = [];
    
    for (const artifact of aggregatedArtifacts) {
      const content = await downloadArtifact(artifact.id, token);
      if (content) {
        const parsed = parseBenchmarkResults(content, runDate, runId, commitSha);
        results.push(...parsed);
      }
    }
    
    console.log(`  Got ${results.length} results from aggregated artifacts`);
    return results;
  }
  
  // Strategy 2: Parse individual artifacts (they contain single JSON results)
  // Filter for artifacts that look like benchmark results (contain model/config info)
  const benchmarkArtifacts = artifacts.filter(a => {
    const name = a.name.toLowerCase();
    // Match patterns like: dsr1_1k1k_fp8_sglang_tp8_... or gptoss_1k1k_fp4_vllm_...
    return (name.includes('dsr1_') || name.includes('gptoss_') || name.includes('llama_') || name.includes('qwen_')) &&
           (name.includes('_sglang_') || name.includes('_vllm_') || name.includes('_trt_') || name.includes('_dynamo'));
  });
  
  console.log(`  Parsing ${benchmarkArtifacts.length} individual benchmark artifacts`);
  
  const results: BenchmarkResult[] = [];
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 20;
  for (let i = 0; i < benchmarkArtifacts.length; i += batchSize) {
    const batch = benchmarkArtifacts.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (artifact) => {
        const content = await downloadArtifact(artifact.id, token);
        if (content) {
          return parseBenchmarkResults(content, runDate, runId, commitSha);
        }
        return [];
      })
    );
    
    results.push(...batchResults.flat());
    
    // Small delay between batches
    if (i + batchSize < benchmarkArtifacts.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  console.log(`  Got ${results.length} results from individual artifacts`);
  return results;
}

// Main function to fetch all benchmark data
export async function fetchAllBenchmarkData(
  token: string,
  days: number = 30,
  workflow: string = 'full-sweep-1k1k-scheduler.yml'
): Promise<BenchmarkResult[]> {
  console.log(`Fetching benchmark data for ${days} days, workflow: ${workflow}`);
  const allResults: BenchmarkResult[] = [];
  
  // Get workflow runs - fetch more pages for older data
  const maxPages = days > 60 ? 10 : 5;
  const runs = await fetchWorkflowRuns(workflow, token, maxPages);
  console.log(`Found ${runs.length} total runs`);
  
  // Filter by date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const recentRuns = runs.filter(r => new Date(r.created_at) >= cutoff);
  console.log(`${recentRuns.length} runs in date range`);
  
  // Process each run - increase limit for more data
  const maxRuns = Math.min(recentRuns.length, 30);
  
  for (let i = 0; i < maxRuns; i++) {
    const run = recentRuns[i];
    try {
      const results = await processRun(run, token);
      allResults.push(...results);
    } catch (error) {
      console.error(`Error processing run ${run.id}:`, error);
    }
    
    // Small delay between runs
    if (i < maxRuns - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`Total benchmark results: ${allResults.length}`);
  return allResults;
}
