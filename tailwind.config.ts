import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        coral:   '#FF6B6B',
        peach:   '#FF9F43',
        mint:    '#6BCB77',
        sky:     '#4ECDC4',
        lavender:'#C77DFF',
        pink:    '#FF6B9D',
        yellow:  '#FFD93D',
        navy:    '#1B2A4A',
        navyL:   '#2A3F6F',
        ink:     '#1a1410',
        muted:   '#9A8F88',
        border:  '#EDE8E0',
        cream:   '#FFF9F0',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        sans:     ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
