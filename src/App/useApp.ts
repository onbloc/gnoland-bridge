import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'

import adenaService, { type AdenaSession } from 'services/adenaService'
import metaMaskService from 'services/metaMaskService'
import useAuth from 'hooks/useAuth'
import { WalletEnum } from 'types/wallet'

// Module-scoped guard so React 18 StrictMode's double-mount (or any other
// accidental re-invocation) doesn't fire two simultaneous unlock prompts.
let initStarted = false

// Shown in the Adena establish popup as the site label.
const SITE_NAME = 'Gno.land Bridge'

const useApp = (): {
  initApp: () => Promise<void>
} => {
  const { loginGno, loginEvm, disconnectGno, disconnectEvm } = useAuth()

  const applySession = async (session: AdenaSession): Promise<void> => {
    await loginGno({
      address: session.address,
      chainId: session.chainId,
      publicKey: session.publicKey,
      networkName: session.networkName,
      rpcUrl: session.rpcUrl,
      walletType: WalletEnum.Adena,
    })
  }

  const applyEvm = async (
    address: string,
    provider: unknown
  ): Promise<void> => {
    const walletClient = createWalletClient({
      account: address as `0x${string}`,
      chain: mainnet,
      transport: custom(provider as never),
    })
    await loginEvm({
      address,
      walletClient,
      walletType: WalletEnum.MetaMask,
    })
  }

  const initApp = async (): Promise<void> => {
    if (initStarted) return
    initStarted = true

    // 1) Adena silent reconnect (and locked-wallet single prompt).
    const result = await adenaService.restore()
    if (result.kind === 'session') {
      await applySession(result.session)
    } else if (result.kind === 'locked') {
      try {
        const session = await adenaService.connect()
        await applySession(session)
      } catch (e) {
        console.info('[adena] unlock prompt dismissed or failed', e)
      }
    }

    // 2) MetaMask silent reconnect: eth_accounts is no-prompt and returns
    //    the previously-authorized address if any. Mirrors Adena's behavior
    //    so the header reflects "permission granted" state on page load.
    const evm = await metaMaskService.restore()
    if (evm?.address) {
      try {
        await applyEvm(evm.address, evm.provider)
      } catch (e) {
        console.warn('[metamask] auto-restore failed', e)
      }
    }

    // 3) Adena network/account change subscriptions.
    adenaService.onNetworkChange(async () => {
      const r = await adenaService.restore()
      if (r.kind === 'session') await applySession(r.session)
    })

    adenaService.onAccountChange(async () => {
      // The newly selected account may not have authorized this site yet.
      // Ask Adena to (re-)establish: ALREADY_CONNECTED is silent, otherwise
      // a single consent popup is shown. Drop to disconnected on rejection.
      const status = await adenaService.establish(SITE_NAME)
      if (status === 'rejected') {
        disconnectGno()
        return
      }
      const r = await adenaService.restore()
      if (r.kind === 'session') {
        await applySession(r.session)
      } else {
        disconnectGno()
      }
    })

    // 4) MetaMask accountsChanged: keep the header in sync when the user
    //    switches accounts or revokes the site's permission.
    metaMaskService.onAccountsChanged(async (accounts) => {
      const next = accounts?.[0]
      if (!next) {
        disconnectEvm()
        return
      }
      try {
        await applyEvm(next, window.ethereum)
      } catch (e) {
        console.warn('[metamask] accountsChanged apply failed', e)
      }
    })

    // 5) MetaMask chainChanged: keep the selected chain in app state when
    //    the user changes networks directly in the wallet.
    metaMaskService.onChainChanged(async () => {
      const evm = await metaMaskService.restore()
      if (!evm?.address) {
        disconnectEvm()
        return
      }
      try {
        await applyEvm(evm.address, evm.provider)
      } catch (e) {
        console.warn('[metamask] chainChanged apply failed', e)
      }
    })
  }

  return {
    initApp,
  }
}

export default useApp
