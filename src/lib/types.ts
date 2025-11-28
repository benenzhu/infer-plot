export interface BenchmarkResult {
  model: string;
  hardware: string;
  framework: string;
  precision: string;
  isl: number;
  osl: number;
  tp: number;
  ep: number;
  dpAttention: boolean;
  concurrency: number;
  ttft: number;
  tpot: number;
  interactivity: number;
  e2el: number;
  tputPerGpu: number;
  outputTputPerGpu: number;
  inputTputPerGpu: number;
  runDate: string;
  runId: string;
  commitSha?: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  created_at: string;
  conclusion: string;
  html_url: string;
  head_sha: string;
  run_number: number;
}

export interface FilterState {
  model: string[];
  hardware: string[];
  framework: string[];
  precision: string[];
  tp: string[];
  concurrency: string[];
}

export interface TimeSeriesDataPoint {
  date: string;
  runId: string;
  commitSha: string;
  value: number;
  configKey: string;
}

export interface ConfigGroup {
  key: string;
  label: string;
  model: string;
  hardware: string;
  framework: string;
  precision: string;
  tp: number;
  ep: number;
  concurrency: number;
  data: TimeSeriesDataPoint[];
}

// For chart display
export interface ChartLine {
  configKey: string;
  label: string;
  color: string;
  data: { date: string; value: number; runId: string }[];
}
