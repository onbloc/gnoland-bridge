import { ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { useSwitchChain } from 'wagmi'

import useAuth from 'hooks/useAuth'

import AuthStore from 'store/AuthStore'
import NetworkStore from 'store/NetworkStore'

import {
  BRIDGE_NETWORK_OPTIONS,
  getBridgeGnoNetwork,
  resolveBridgeNetworkOption,
  type BridgeNetworkOption,
} from 'consts/gnoNetworks'
import adenaService from 'services/adenaService'
import { WalletEnum } from 'types/wallet'

const ADENA_SITE_NAME = 'Gno.land Bridge'

const NetworkSelector = (): ReactElement => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const autoSwitchAttemptRef = useRef<string | null>(null)
  const [bridgeNetworkMode, setBridgeNetworkMode] = useRecoilState(
    NetworkStore.bridgeNetworkMode
  )
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const evmNetwork = useRecoilValue(NetworkStore.evmNetwork)
  const { loginGno } = useAuth()
  const { switchChainAsync } = useSwitchChain()

  const selectedOption = useMemo(
    () => resolveBridgeNetworkOption(bridgeNetworkMode),
    [bridgeNetworkMode]
  )
  const selectedGnoNetwork = useMemo(
    () => getBridgeGnoNetwork(bridgeNetworkMode),
    [bridgeNetworkMode]
  )

  const gnoNeedsSwitch =
    !!gnoWallet && gnoWallet.chainId !== selectedGnoNetwork.chainId
  const evmNeedsSwitch =
    !!evmWallet && evmNetwork?.chainId !== selectedOption.evmChainId
  const needsWalletSync =
    selectedOption.supported && (gnoNeedsSwitch || evmNeedsSwitch)

  useEffect(() => {
    if (!isOpen) return

    const onMouseDown = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  const refreshGnoSession = async (): Promise<boolean> => {
    const restored = await adenaService.restore()
    if (restored.kind !== 'session') return false

    await loginGno({
      address: restored.session.address,
      chainId: restored.session.chainId,
      publicKey: restored.session.publicKey,
      networkName: restored.session.networkName,
      rpcUrl: restored.session.rpcUrl,
      walletType: WalletEnum.Adena,
    })
    return true
  }

  const syncWalletNetworks = async (
    option: BridgeNetworkOption
  ): Promise<void> => {
    const targetGnoNetwork = getBridgeGnoNetwork(option.id)

    if (adenaService.checkInstalled()) {
      if (!gnoWallet) {
        const status = await adenaService.establish(ADENA_SITE_NAME)
        if (status === 'rejected') {
          return
        }
      }

      await adenaService.ensureNetwork(targetGnoNetwork)
      await refreshGnoSession()
    }

    // useEvmWalletSync mirrors the resulting chainChanged event back into
    // Recoil, so there's no manual wallet-client refresh needed here.
    if (evmWallet) {
      await switchChainAsync({ chainId: option.evmChainId })
    }
  }

  useEffect(() => {
    if (!selectedOption.supported) return
    if (!gnoWallet || !adenaService.checkInstalled()) return
    if (gnoWallet.chainId === selectedGnoNetwork.chainId) {
      autoSwitchAttemptRef.current = null
      return
    }

    const attemptKey = `${gnoWallet.chainId}:${selectedGnoNetwork.chainId}`
    if (autoSwitchAttemptRef.current === attemptKey) return
    autoSwitchAttemptRef.current = attemptKey

    setIsSwitching(true)
    adenaService
      .ensureNetwork(selectedGnoNetwork)
      .then(refreshGnoSession)
      .catch((e) => {
        console.warn('[network-selector] auto dev network sync failed', e)
      })
      .finally(() => {
        setIsSwitching(false)
      })
  }, [gnoWallet?.chainId, selectedGnoNetwork, selectedOption.supported])

  const onSelect = async (option: BridgeNetworkOption): Promise<void> => {
    if (!option.supported) return

    setBridgeNetworkMode(option.id)
    setIsOpen(false)
    setIsSwitching(true)

    try {
      await syncWalletNetworks(option)
    } catch (e) {
      console.warn('[network-selector] wallet network sync failed', e)
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="network-selector" ref={rootRef}>
      <button
        type="button"
        className={`network-selector__button${
          needsWalletSync ? ' is-warning' : ''
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={
          needsWalletSync ? 'Wallet network mismatch' : selectedOption.label
        }
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="network-selector__button-dot" aria-hidden="true" />
        <span className="network-selector__label">
          {isSwitching ? 'Switching' : selectedOption.label}
        </span>
        <span className="network-selector__chevron" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="network-selector__menu" role="menu">
          {BRIDGE_NETWORK_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.id}
              className={`network-selector__item${
                option.id === selectedOption.id ? ' is-selected' : ''
              }`}
              disabled={!option.supported || isSwitching}
              role="menuitem"
              onClick={() => onSelect(option)}
            >
              <span>
                <span className="network-selector__item-label">
                  {option.label}
                </span>
                <span className="network-selector__item-helper">
                  {option.helperText}
                </span>
              </span>
              <span className="network-selector__item-dot" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NetworkSelector
