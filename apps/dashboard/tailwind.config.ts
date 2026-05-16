import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#F97316',
        'dark-bg': '#0F0F0F',
        'card-bg': '#1A1A1A',
        border: '#2A2A2A',
      },
    },
  },
  plugins: [],
}

export default config
