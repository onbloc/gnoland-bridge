import { ReactElement, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from '../routes'
import { QueryClient, QueryClientProvider } from 'react-query'

import Header from 'components/layouts/Header'
import Footer from 'components/layouts/Footer'
import SelectWalletModal from './SelectWalletModal'
import AdenaDownModal from './AdenaDownModal'
import NetworkErrorScreen from './NetworkErrorScreen'

import useApp from './useApp'

const queryClient = new QueryClient()

const App = (): ReactElement => {
  const { initApp } = useApp()

  useEffect(() => {
    // Don't gate rendering on this: Adena's restore-on-mount waits on
    // waitForAdena() (adenaService.ts) to inject window.adena before
    // concluding it's not installed, which used to blank the whole app for
    // that long on every load when Adena isn't installed. Run it in the
    // background instead - Recoil state updates reactively once/if it
    // resolves.
    initApp().catch((e) => console.warn('[app] initApp failed', e))
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
