import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    proxy: {
      // Mirror the Vercel rewrite so /gno-rpc works the same in dev and
      // production. The page may be served over HTTPS (preview/prod) while
      // the gno-ibc devnet is plain HTTP, so client-side fetches would hit
      // a mixed-content block; routing through same-origin avoids it.
      '/gno-rpc': {
        target: 'http://23.20.153.250:26657',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gno-rpc/, ''),
      },
      '/relayer-api': {
        target: 'https://rpc.bridge.onbloc.xyz:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/relayer-api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      components: path.resolve(__dirname, 'src/components'),
      consts: path.resolve(__dirname, 'src/consts'),
      hooks: path.resolve(__dirname, 'src/hooks'),
      images: path.resolve(__dirname, 'src/images'),
      packages: path.resolve(__dirname, 'src/packages'),
      pages: path.resolve(__dirname, 'src/pages'),
      services: path.resolve(__dirname, 'src/services'),
      store: path.resolve(__dirname, 'src/store'),
      types: path.resolve(__dirname, 'src/types'),
      ics20: path.resolve(__dirname, 'src/ics20'),
      'chain-configs': path.resolve(__dirname, 'src/chain-configs'),
    },
  },
})
