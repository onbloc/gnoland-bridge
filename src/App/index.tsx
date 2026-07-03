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

const AppBody = (): ReactElement | null => {
  const [initComplete, setInitComplete] = useState(false)

  const { initApp } = useApp()
  useEvmWalletSync()

  useEffect(() => {
    initApp().then(() => {
      setInitComplete(true)
    })
  }, [])

  if (!initComplete) return null

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
        <ConnectKitProvider>
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
