import { ReactElement } from 'react'
import { useRecoilValue } from 'recoil'
import { NavLink } from 'react-router-dom'
import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'

import useAuth from 'hooks/useAuth'

import AuthStore from 'store/AuthStore'

import WalletBadge from 'components/WalletBadge'
import GnoLogo from 'components/GnoLogo'
import ThemeToggle from 'components/ThemeToggle'
import { WalletEnum } from 'types/wallet'
import adenaService from 'services/adenaService'
import metaMaskService from 'services/metaMaskService'

const Header = (): ReactElement => {
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const { loginGno, loginEvm, disconnectGno, disconnectEvm } = useAuth()

  const connectAdena = async (): Promise<void> => {
    if (adenaService.checkInstalled()) {
      const { address, chainId, publicKey, networkName, rpcUrl } =
        await adenaService.connect()
      await loginGno({
        address,
        chainId,
        publicKey,
        networkName,
        rpcUrl,
        walletType: WalletEnum.Adena,
      })
    } else {
      window.open(adenaService.ADENA_APP_URL, '_blank')
    }
  }

  const connectMetaMask = async (): Promise<void> => {
    if (metaMaskService.checkInstalled()) {
      const { address, provider } = await metaMaskService.connect()
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain: mainnet,
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
          <NavLink to="/token-init" className={navLinkCls}>
            Token Init
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
