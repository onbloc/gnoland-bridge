import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { RecoilRoot } from 'recoil'
import {
  findActiveChannels,
  queryChannelState,
} from 'packages/union/gno-zkgm-abci'

if (import.meta.env.DEV) {
  // Browser-console helper for discovering live gno-ibc channels during
  // devnet bring-up. Run `__gnoIbc.findActiveChannels()` in DevTools.
  ;(window as unknown as { __gnoIbc: unknown }).__gnoIbc = {
    findActiveChannels,
    queryChannelState,
  }
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <RecoilRoot>
      <App />
    </RecoilRoot>
  </React.StrictMode>
)
