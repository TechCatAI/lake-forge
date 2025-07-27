const baseConfig = {
  content: [
    './apps/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: 'oklch(var(--background)/<alpha-value>)',
        border: 'oklch(var(--border)/<alpha-value>)',
        primary: 'oklch(var(--primary)/<alpha-value>)',
        muted: 'oklch(var(--muted)/<alpha-value>)',
        blueprint: {
          blue: '#2E66FF',
          magenta: '#C300FF',
          pink: '#FF3C6E',
          surface: '#0F0F0F',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      keyframes: {
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        gradient: 'gradient 8s linear infinite',
      },
    },
  },
  plugins: [],
}
export default baseConfig;
