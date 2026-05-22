import { ReactElement, useEffect, useState } from 'react'
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
  const [initComplete, setInitComplete] = useState(false)

  const { initApp } = useApp()
  useEffect(() => {
    initApp().then(() => {
      setInitComplete(true)
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {initComplete && (
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
        )}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
