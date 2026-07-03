import { useEffect, useRef } from 'react'
import { useRecoilValue } from 'recoil'
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi'

import useAuth from 'hooks/useAuth'
import NetworkStore from 'store/NetworkStore'
import { resolveBridgeNetworkOption } from 'consts/gnoNetworks'

// Mirrors wagmi's live connection state into the Recoil AuthStore/NetworkStore
// atoms that the rest of the app already reads (useBridge, useEtherBaseBalance,
// NetworkSelector, Header, etc). This is the only place wagmi hooks touch
// Recoil, so those consumers stay untouched by the wagmi/ConnectKit migration.
const useEvmWalletSync = (): void => {
  const { address, isConnected, connector, status } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { loginEvm, disconnectEvm } = useAuth()
  const bridgeNetworkMode = useRecoilValue(NetworkStore.bridgeNetworkMode)
  const prevStatus = useRef(status)

  useEffect(() => {
    if (isConnected && address && walletClient) {
      loginEvm({
        address,
        walletClient,
        walletType: connector?.name || 'Wallet',
      })
    } else {
      disconnectEvm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, walletClient, chainId, connector?.name])

  useEffect(() => {
    // Mirrors the old metaMaskService.switchToSepolia() call that used to
    // run inline in Header's connect handler: a fresh, user-initiated
    // connect should land on whatever EVM chain the currently selected
    // bridge network expects. Silent restore-on-mount ('reconnecting' ->
    // 'connected') is deliberately excluded so we don't pop a wallet
    // network-switch prompt on every page load.
    const wasExplicitConnect = prevStatus.current === 'connecting'
    prevStatus.current = status

    if (status !== 'connected' || !wasExplicitConnect) return

    const option = resolveBridgeNetworkOption(bridgeNetworkMode)
    if (option.supported && chainId !== option.evmChainId) {
      switchChainAsync({ chainId: option.evmChainId }).catch((e) => {
        console.warn('[evm-wallet-sync] post-connect chain switch failed', e)
      })
    }
  }, [status, chainId, bridgeNetworkMode, switchChainAsync])
}

export default useEvmWalletSync
