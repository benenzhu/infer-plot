import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InferenceMAX Dashboard',
  description: 'LLM Inference Benchmark Performance Dashboard - Historical Trends',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1a1a1a]">
        {children}
      </body>
    </html>
  )
}
