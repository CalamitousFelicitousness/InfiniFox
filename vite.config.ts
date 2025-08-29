// vite.config.ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: [
      // ensure runtime JSX maps when deps import it
      { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
      { find: 'react/jsx-dev-runtime', replacement: 'preact/jsx-dev-runtime' },

      // map reconciler to preact's implementation (absolute paths)
      {
        find: /^react-reconciler\/constants(\.js)?$/,
        replacement: require.resolve('preact-reconciler/constants'),
      },
      {
        find: /^react-reconciler$/,
        replacement: require.resolve('preact-reconciler'),
      },
    ],
  },
})
