import { useEffect } from 'react'

const useReloadOnNetworkChange = (): void => {
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = (): void => {
        window.location.reload()
      }
      window.ethereum.on('chainChanged', handleChainChanged)
      return (): void => {
        window.ethereum?.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])
}

export default useReloadOnNetworkChange
