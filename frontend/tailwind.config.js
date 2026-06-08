/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        zh: ['"Noto Serif SC"', '"Noto Serif"', 'Georgia', 'serif'],
      },
      colors: {
        // Pinyin tone colors (classic Pleco/MDBG scheme)
        tone: {
          1: '#d11149', // high-flat — rose/red
          2: '#1f9d55', // rising — green
          3: '#2563eb', // dip — blue
          4: '#8b3ffb', // falling — violet
          0: '#94a3b8', // neutral — slate
        },
        // Pronunciation score bands
        score: {
          good: '#16a34a',
          'good-bg': '#f0fdf4',
          'good-bd': '#bbf7d0',
          mid: '#d97706',
          'mid-bg': '#fffbeb',
          'mid-bd': '#fde68a',
          bad: '#dc2626',
          'bad-bg': '#fef2f2',
          'bad-bd': '#fecaca',
        },
      },
      boxShadow: {
        accent: '0 10px 24px -10px rgba(124, 58, 237, 0.42)',
      },
      keyframes: {
        riseIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        blink: {
          '0%, 80%, 100%': { opacity: 0.25, transform: 'translateY(0)' },
          '40%': { opacity: 1, transform: 'translateY(-3px)' },
        },
      },
      animation: {
        rise: 'riseIn .32s cubic-bezier(.2,.7,.2,1) both',
        pop: 'pop .28s cubic-bezier(.2,.8,.2,1) both',
        blink: 'blink 1.2s infinite both',
      },
    },
  },
  plugins: [],
};
