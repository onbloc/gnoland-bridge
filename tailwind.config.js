/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface-1': 'var(--bg-surface-1)',
        'bg-surface-2': 'var(--bg-surface-2)',
        'bg-brand': 'var(--bg-brand)',
        'bg-brand-hover': 'var(--bg-brand-hover)',
        'bg-brand-weak': 'var(--bg-brand-weak)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
        'text-on-brand': 'var(--text-on-brand)',
        'text-link': 'var(--text-link)',
        'border-1': 'var(--border-1)',
        'border-2': 'var(--border-2)',
        'border-3': 'var(--border-3)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        // Legacy aliases mapped to new tokens so existing class names keep working
        // during the migration. Remove once all references are gone.
        'bridge-bg': 'var(--bg-base)',
        'bridge-dark': 'var(--bg-surface-2)',
        'bridge-gray': 'var(--bg-surface-1)',
        'bridge-sky': 'var(--bg-brand)',
        'bridge-white': 'var(--text-primary)',
        'bridge-red': 'oklch(0.62 0.16 30)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Roboto', 'Menlo', 'Consolas', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.6875rem',
      },
      borderRadius: {
        DEFAULT: '2px',
        none: '0',
        sm: '2px',
        md: '4px',
        full: '9999px',
        bridge: '2px',
      },
      keyframes: {
        dropdown: {
          '0%': { opacity: '0', marginBottom: '0' },
          '100%': { marginBottom: '-40px', opacity: '1' },
        },
      },
      animation: {
        dropdown: 'dropdown 0.3s ease',
      },
    },
  },
  plugins: [],
}
