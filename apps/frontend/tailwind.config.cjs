import baseConfig from '../../tailwind.config.mjs'
export default {
  ...baseConfig,
  content: [
    './src/**/*.{ts,tsx}',
    '../../apps/**/*.{ts,tsx}',
  ],
}
