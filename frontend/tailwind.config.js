/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121826', paper: '#F4F5F7', panel: '#FFFFFF', line: '#E2E5EA',
        sidebar: { DEFAULT: '#121826', light: '#1B2333', border: '#E2E5EA' },
        compass: { DEFAULT: '#0E6B5C', light: '#2E8B7A', dark: '#0A5246' },
        milestone: { DEFAULT: '#D9902F', light: '#E8AE5C', dark: '#9A5F0E' },
        signal: { DEFAULT: '#1E9E6A', light: '#3CBF88' }, alert: '#C8374A', cyan: '#2B7FA8'
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      backgroundImage: { brand: 'linear-gradient(#0E6B5C,#0E6B5C)', 'brand-soft': 'linear-gradient(rgba(14,107,92,.08),rgba(14,107,92,.08))' },
      borderRadius: { control: '8px', tag: '6px', card: '12px' },
      boxShadow: { soft: '0 1px 2px rgba(18,24,38,.05), 0 12px 24px -16px rgba(18,24,38,.18)', glow: '0 6px 16px -8px rgba(14,107,92,.5)' }
    }
  }, plugins: []
};
