# InferenceMAX Dashboard

A modern benchmark dashboard for visualizing LLM inference performance data from [InferenceMAX](https://inferencemax.semianalysis.com/).

![Dashboard Preview](https://via.placeholder.com/800x400?text=InferenceMAX+Dashboard)

## Features

- 📊 **Interactive Charts**: Throughput vs Latency scatter plots with customizable axes
- 📈 **Trend Analysis**: Historical performance trends over time
- 🔍 **Advanced Filtering**: Filter by model, hardware, framework, precision, and sequence lengths
- 📋 **Sortable Data Table**: Full benchmark results with search and sort capabilities
- 🎨 **Cyberpunk UI**: Modern dark theme with neon accents

## Metrics Displayed

| Metric | Description |
|--------|-------------|
| TTFT | Time to First Token (ms) |
| TPOT | Time per Output Token (ms) |
| E2EL | End-to-End Latency (s) |
| TPUT/GPU | Throughput per GPU (tokens/s) |
| Interactivity | Tokens per second per user |

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Environment Variables (Optional)

For higher GitHub API rate limits, set:

```bash
GITHUB_TOKEN=your_github_token
```

## Data Source

Benchmark data is sourced from [InferenceMAX GitHub Actions](https://github.com/InferenceMAX/InferenceMAX/actions).

The project runs nightly benchmarks on:
- **Hardware**: GB200, B200, H100, A100
- **Frameworks**: DYNAMO-TRTLLM, DYNAMO-SGLANG, SGLANG, VLLM
- **Models**: DeepSeek-R1, GPT-OSS, and more
- **Precisions**: FP4, FP8, FP16

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Language**: TypeScript

## Related Links

- [InferenceMAX Official Site](https://inferencemax.semianalysis.com/)
- [InferenceMAX GitHub](https://github.com/InferenceMAX/InferenceMAX)
- [SemiAnalysis](https://semianalysis.com/)

## License

MIT

