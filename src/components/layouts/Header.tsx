import { ReactElement } from 'react'
import { useRecoilValue } from 'recoil'
import { NavLink } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectKitButton } from 'connectkit'

import useAuth from 'hooks/useAuth'

import AuthStore from 'store/AuthStore'
import NetworkStore from 'store/NetworkStore'

import WalletBadge from 'components/WalletBadge'
import GnoLogo from 'components/GnoLogo'
import ThemeToggle from 'components/ThemeToggle'
import { WalletEnum } from 'types/wallet'
import adenaService, { type AdenaSession } from 'services/adenaService'
import {
  getBridgeGnoNetwork,
  resolveBridgeNetworkOption,
} from 'consts/gnoNetworks'
import { TOKEN_INIT_ENABLED } from 'packages/union/gno-zkgm-constants'
import GenericWalletSvg from 'images/wallet.svg'

const ADENA_SITE_NAME = 'Gno.land Bridge'

const Header = (): ReactElement => {
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const bridgeNetworkMode = useRecoilValue(NetworkStore.bridgeNetworkMode)
  const { loginGno, disconnectGno } = useAuth()
  const { disconnect: disconnectWagmi } = useDisconnect()
  const { connector: evmConnector } = useAccount()
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
          {TOKEN_INIT_ENABLED && (
            <NavLink to="/token-init" className={navLinkCls}>
              Token Init
            </NavLink>
          )}
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
            <ConnectKitButton.Custom>
              {({ show }): ReactElement => (
                <WalletBadge
                  label="Connect Wallet"
                  walletEnum={WalletEnum.MetaMask}
                  address={evmWallet?.address || null}
                  onConnect={(): void => show?.()}
                  onDisconnect={(): void => disconnectWagmi()}
                  iconSrc={evmConnector?.icon || GenericWalletSvg}
                />
              )}
            </ConnectKitButton.Custom>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
