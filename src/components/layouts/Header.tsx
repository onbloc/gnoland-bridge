import { ReactElement } from 'react'
import { useRecoilValue } from 'recoil'
import { NavLink } from 'react-router-dom'
import { createWalletClient, custom, type Chain } from 'viem'
import { mainnet } from 'viem/chains'

import useAuth from 'hooks/useAuth'

import AuthStore from 'store/AuthStore'
import NetworkStore from 'store/NetworkStore'

import WalletBadge from 'components/WalletBadge'
import GnoLogo from 'components/GnoLogo'
import ThemeToggle from 'components/ThemeToggle'
import { WalletEnum } from 'types/wallet'
import adenaService, { type AdenaSession } from 'services/adenaService'
import metaMaskService from 'services/metaMaskService'
import {
  getBridgeGnoNetwork,
  resolveBridgeNetworkOption,
} from 'consts/gnoNetworks'
import { sepoliaChain } from 'packages/union/evm-chains'

const ADENA_SITE_NAME = 'Gno.land Bridge'

const Header = (): ReactElement => {
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const bridgeNetworkMode = useRecoilValue(NetworkStore.bridgeNetworkMode)
  const { loginGno, loginEvm, disconnectGno, disconnectEvm } = useAuth()
  const bridgeNetworkOption = resolveBridgeNetworkOption(bridgeNetworkMode)

  const connectAdena = async (): Promise<void> => {
    if (adenaService.checkInstalled()) {
      const targetGnoNetwork = getBridgeGnoNetwork(bridgeNetworkMode)
      let session: AdenaSession | undefined

      try {
        const establishStatus = await adenaService.establish(ADENA_SITE_NAME)
        if (establishStatus === 'connected') {
          const restored = await adenaService.restore()
          if (restored.kind === 'session') {
            session = restored.session
          }
        }
      } catch (e) {
        console.warn('[adena] establish failed', e)
      }

      if (!session) {
        session = await adenaService.connect()
      }

      if (bridgeNetworkOption.supported) {
        try {
          await adenaService.ensureNetwork(targetGnoNetwork)
          const restored = await adenaService.restore()
          if (restored.kind === 'session') {
            session = restored.session
          }
        } catch (e) {
          console.warn('[adena] selected network sync failed', e)
        }
      }

      await loginGno({
        address: session.address,
        chainId: session.chainId,
        publicKey: session.publicKey,
        networkName: session.networkName,
        rpcUrl: session.rpcUrl,
        walletType: WalletEnum.Adena,
      })
    } else {
      window.open(adenaService.ADENA_APP_URL, '_blank')
    }
  }

  const connectMetaMask = async (): Promise<void> => {
    if (metaMaskService.checkInstalled()) {
      const { address, provider } = await metaMaskService.connect()
      let chain: Chain = mainnet

      if (
        bridgeNetworkOption.supported &&
        bridgeNetworkOption.evmChainId === sepoliaChain.id
      ) {
        try {
          await metaMaskService.switchToSepolia()
          chain = sepoliaChain
        } catch (e) {
          console.warn('[metamask] selected network sync failed', e)
        }
      }

      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport: custom(provider),
      })
      await loginEvm({
        address,
        walletClient,
        walletType: WalletEnum.MetaMask,
      })
    } else {
      metaMaskService.install()
    }
  }

  const navLinkCls = ({ isActive }: { isActive: boolean }): string =>
    `b-nav__link${isActive ? ' is-active' : ''}`

  return (
    <header className="b-header">
      <div className="b-header__inner">
        <GnoLogo />
        <nav className="b-nav" aria-label="primary">
          <NavLink to="/" end className={navLinkCls}>
            Bridge
          </NavLink>
          <NavLink to="/dashboard" className={navLinkCls}>
            Dashboard
          </NavLink>
        </nav>
        <div className="b-header__actions">
          <ThemeToggle />
          <div className="wallet-group">
            <WalletBadge
              label="Connect Adena"
              walletEnum={WalletEnum.Adena}
              address={gnoWallet?.address || null}
              onConnect={connectAdena}
              onDisconnect={disconnectGno}
            />
            <WalletBadge
              label="Connect MetaMask"
              walletEnum={WalletEnum.MetaMask}
              address={evmWallet?.address || null}
              onConnect={connectMetaMask}
              onDisconnect={disconnectEvm}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
