export default {
  content: [
    './apps/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
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
