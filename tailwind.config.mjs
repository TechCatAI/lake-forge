export default {
  content: [
    './apps/frontend/src/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
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
    },
  },
  plugins: [],
}
