import { ReactElement, useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from '../routes'
import { QueryClient, QueryClientProvider } from 'react-query'
import {
  QueryClient as TanstackQueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { ConnectKitProvider } from 'connectkit'

import { wagmiConfig } from 'config/wagmi'
import Header from 'components/layouts/Header'
import Footer from 'components/layouts/Footer'
import SelectWalletModal from './SelectWalletModal'
import AdenaDownModal from './AdenaDownModal'
import NetworkErrorScreen from './NetworkErrorScreen'

import useApp from './useApp'
import useEvmWalletSync from 'hooks/useEvmWalletSync'

const queryClient = new QueryClient()
const tanstackQueryClient = new TanstackQueryClient()

// Cap how long we hold the first paint for initApp() (Adena silent restore).
// Long enough that an already-authorized, unlocked wallet resolves before it
// fires (avoids a "Connect Adena" flash that immediately flips to
// connected), short enough that it's not perceptible as a freeze, and far
// below Adena's own up-to-1s "not installed" poll timeout so that case is
// never fully blocking either.
const INIT_GRACE_MS = 500

const AppBody = (): ReactElement | null => {
  const [ready, setReady] = useState(false)
  const { initApp } = useApp()
  useEvmWalletSync()

  // initApp() keeps running even if the grace window times out first - it
  // still updates Recoil whenever it actually resolves, same as before.
  useEffect(() => {
    let cancelled = false
    const grace = new Promise<void>((resolve) =>
      setTimeout(resolve, INIT_GRACE_MS)
    )
    Promise.race([initApp(), grace]).finally(() => {
      if (!cancelled) setReady(true)
    })
    return (): void => {
      cancelled = true
    }
  }, [])

  if (!ready) return null

  return (
    <>
      <div className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">
          <AppRoutes />
        </main>
        <Footer />
      </div>
      <SelectWalletModal />
      <AdenaDownModal />
      <NetworkErrorScreen />
    </>
  )
}

const App = (): ReactElement => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <TanstackQueryClientProvider client={tanstackQueryClient}>
        <ConnectKitProvider
          customTheme={{
            // Tones ConnectKit's "danger" accent (error headings, warning
            // badges, the empty-connector-list alert) down to the app's own
            // muted text color instead of a bright red, and tracks light/
            // dark mode automatically since --text-secondary already does.
            '--ck-body-color-danger': 'var(--text-secondary)',
          }}
        >
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AppBody />
            </BrowserRouter>
          </QueryClientProvider>
        </ConnectKitProvider>
      </TanstackQueryClientProvider>
    </WagmiProvider>
  )
}

export default App
