import adenaService, { type AdenaSession } from 'services/adenaService'
import useAuth from 'hooks/useAuth'
import { WalletEnum } from 'types/wallet'

// Module-scoped guard so React 18 StrictMode's double-mount (or any other
// accidental re-invocation) doesn't fire two simultaneous unlock prompts.
let initStarted = false

// Shown in the Adena establish popup as the site label.
const SITE_NAME = 'Gno.land Bridge'

// EVM connect/restore/account-change/chain-change is handled entirely by
// wagmi + useEvmWalletSync now; this hook only drives the Adena/Gno side.
const useApp = (): {
  initApp: () => Promise<void>
} => {
  const { loginGno, disconnectGno } = useAuth()

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

    // 2) Adena network/account change subscriptions.
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
  }

  return {
    initApp,
  }
}

export default useApp
