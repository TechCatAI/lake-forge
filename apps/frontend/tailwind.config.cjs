const baseConfig = require('../../tailwind.config.mjs')

module.exports = {
  ...baseConfig,
  darkMode: 'class',        // ← make Tailwind look for a `.dark` class
  content: [
    './src/**/*.{ts,tsx}',
    '../../apps/**/*.{ts,tsx}',
  ],
}