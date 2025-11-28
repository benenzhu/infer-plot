/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cyber': {
          'bg': '#0a0e17',
          'surface': '#111827',
          'border': '#1f2937',
          'accent': '#00ff9d',
          'accent-dim': '#00cc7d',
          'secondary': '#06b6d4',
          'warning': '#f59e0b',
          'danger': '#ef4444',
          'text': '#e5e7eb',
          'muted': '#9ca3af',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ff9d, 0 0 10px #00ff9d' },
          '100%': { boxShadow: '0 0 10px #00ff9d, 0 0 20px #00ff9d, 0 0 30px #00ff9d' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

