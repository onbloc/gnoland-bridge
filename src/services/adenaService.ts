import {
  AdenaSDK,
  WalletResponseStatus,
  type AccountInfo,
} from '@adena-wallet/sdk'

import type { GnoNetwork } from 'consts/gnoNetworks'

let sdkInstance: AdenaSDK | null = null

const getSDK = (): AdenaSDK => {
  if (!sdkInstance) {
    sdkInstance = AdenaSDK.createAdenaWallet()
  }
  return sdkInstance
}

export class AdenaNotInstalledError extends Error {
  constructor() {
    super('Adena wallet is not installed')
    this.name = 'AdenaNotInstalledError'
  }
}

export class AdenaConnectionError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'AdenaConnectionError'
    this.code = code
  }
}

const ADENA_APP_URL = 'https://www.adena.app/#download'

const checkInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.adena
}

export type AdenaSession = {
  address: string
  chainId: string
  publicKey: string
  networkName: string
  rpcUrl: string
}

// Explicit gate for "window.adena is injected". Adena's content script
// assigns window.adena synchronously but its execution order vs. React's
// first useEffect isn't guaranteed. Adena does not dispatch a ready event
// (no EIP-6963, no custom event), so we poll until the global appears and
// reject if it never does within timeoutMs (extension not installed).
// Kept short: callers no longer block app render on this, but a shorter
// timeout still means a snappier "not installed" fallback everywhere else
// (establish/ensureNetwork/etc. during boot's account-change wiring).
const waitForAdena = (timeoutMs = 1000): Promise<void> =>
  new Promise((resolve, reject) => {
    if (checkInstalled()) {
      resolve()
      return
    }
    const start = Date.now()
    const id = setInterval(() => {
      if (checkInstalled()) {
        clearInterval(id)
        resolve()
        return
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(id)
        reject(new Error('adena-not-installed'))
      }
    }, 10)
  })

const requireAdena = async (): Promise<void> => {
  try {
    await waitForAdena()
  } catch {
    throw new AdenaNotInstalledError()
  }
}

// AdenaSDK doesn't expose `getNetwork`, so call the injected window.adena
// API directly. Response shape:
//   { status: 'success' | 'failure', data: { chainId, networkName, rpcUrl, ... } }
const readNetwork = async (): Promise<{
  networkName: string
  rpcUrl: string
}> => {
  try {
    const net = await window.adena?.GetNetwork()
    if (net?.status === 'success' && net.data) {
      return {
        networkName: net.data.networkName ?? '',
        rpcUrl: net.data.rpcUrl ?? '',
      }
    }
  } catch {
    // wallet may be locked or call may be unsupported; fall through
  }
  return { networkName: '', rpcUrl: '' }
}

const isSuccessResponse = (resp: any): boolean => {
  const type = String(resp?.type ?? '')
  return (
    resp?.status === 'success' ||
    type.includes('SUCCESS') ||
    type.includes('ALREADY') ||
    type === 'REDUNDANT_CHANGE_REQUEST'
  )
}

const responseMessage = (resp: any, fallback: string): string =>
  resp?.message || resp?.type || fallback

const addNetwork = async (network: GnoNetwork): Promise<void> => {
  await requireAdena()

  const resp = await window.adena?.AddNetwork?.({
    chainId: network.chainId,
    chainName: network.chainName,
    rpcUrl: network.rpcUrl,
  })
  if (!isSuccessResponse(resp)) {
    throw new AdenaConnectionError(
      responseMessage(resp, `Failed to add Adena network ${network.chainId}`)
    )
  }
}

const switchNetwork = async (chainId: string): Promise<'done' | 'unadded'> => {
  await requireAdena()

  const resp = await window.adena?.SwitchNetwork?.(chainId)
  if (resp?.type === 'UNADDED_NETWORK') {
    return 'unadded'
  }
  if (!isSuccessResponse(resp)) {
    throw new AdenaConnectionError(
      responseMessage(resp, `Failed to switch Adena network ${chainId}`)
    )
  }
  return 'done'
}

const ensureNetwork = async (network: GnoNetwork): Promise<void> => {
  await requireAdena()

  try {
    const account = await window.adena?.GetAccount?.()
    if (
      account?.status === 'success' &&
      account.data?.chainId === network.chainId
    ) {
      return
    }
  } catch {
    // If account lookup is not available yet, continue with SwitchNetwork.
  }

  const switched = await switchNetwork(network.chainId)
  if (switched === 'done') {
    return
  }

  await addNetwork(network)
  const retry = await switchNetwork(network.chainId)
  if (retry !== 'done') {
    throw new AdenaConnectionError(
      `Adena network ${network.chainId} was added but not selected`
    )
  }
}

const connect = async (): Promise<AdenaSession> => {
  if (!checkInstalled()) {
    throw new AdenaNotInstalledError()
  }

  const sdk = getSDK()
  await sdk.connectWallet()

  const resp = await sdk.getAccount()
  if (resp.status !== WalletResponseStatus.SUCCESS || !resp.data) {
    throw new AdenaConnectionError(
      resp.message || 'Failed to retrieve Adena account',
      resp.code
    )
  }

  const account: AccountInfo = resp.data
  const { networkName, rpcUrl } = await readNetwork()

  return {
    address: account.address,
    chainId: account.chainId,
    publicKey: account.publicKey?.value ?? '',
    networkName,
    rpcUrl,
  }
}

export type RestoreResult =
  | { kind: 'session'; session: AdenaSession }
  | { kind: 'locked' } // wallet locked; site likely authorized, needs unlock prompt
  | { kind: 'none' } // no extension or no prior authorization

// Silent reconnect: only succeeds if the user previously authorized this
// site in Adena AND the wallet is currently unlocked. Never shows a popup
// on its own. Caller decides whether to prompt for unlock when `kind` is
// `'locked'`.
//
// IMPORTANT: AdenaSDK keeps its own ConnectionManager state and throws
// "not connect wallet" from `sdk.getAccount()` / `sdk.onChange*()` until
// `sdk.connectWallet()` has run for this page. But `connectWallet()` shows
// a popup for unauthorized sites, which defeats silent restore. So we
// bypass the SDK and call the injected `window.adena` API directly.
const restore = async (): Promise<RestoreResult> => {
  // Explicit wait for the extension to inject window.adena.
  try {
    await waitForAdena()
  } catch {
    console.info('[adena] extension not detected; skip auto-connect')
    return { kind: 'none' }
  }

  let resp
  try {
    resp = await window.adena?.GetAccount()
  } catch (e) {
    console.warn('[adena] restore: GetAccount threw', e)
    return { kind: 'none' }
  }

  if (resp?.status === 'success' && resp.data) {
    const { networkName, rpcUrl } = await readNetwork()
    return {
      kind: 'session',
      session: {
        address: resp.data.address,
        chainId: resp.data.chainId,
        publicKey: resp.data.publicKey?.value ?? '',
        networkName,
        rpcUrl,
      },
    }
  }

  if (resp?.type === 'WALLET_LOCKED') {
    console.info('[adena] wallet locked; will prompt once')
    return { kind: 'locked' }
  }

  console.info('[adena] no prior session:', resp?.type ?? resp?.message)
  return { kind: 'none' }
}

// Direct subscription via the injected event hook. SDK's onChange* methods
// require connectWallet() to have run first; window.adena.On() does not.
// Ask Adena to establish (authorize) the currently-selected account for
// this site. Adena scopes establishment by (account, site), so this is the
// right call whenever the user switches to an account that may not have
// authorized us yet. Silent (`ALREADY_CONNECTED`) when the current account
// is already authorized; shows a popup otherwise.
const establish = async (
  siteName: string
): Promise<'connected' | 'rejected'> => {
  try {
    await waitForAdena()
  } catch {
    return 'rejected'
  }

  try {
    const resp = await window.adena?.AddEstablish?.(siteName)
    const succeeded =
      resp?.type === 'CONNECTION_SUCCESS' || resp?.type === 'ALREADY_CONNECTED'
    if (!succeeded) {
      console.info('[adena] establish failed:', resp?.type ?? resp?.message)
    }
    return succeeded ? 'connected' : 'rejected'
  } catch (e) {
    console.warn('[adena] establish threw', e)
    return 'rejected'
  }
}

const onNetworkChange = async (
  cb: (chainId: string) => void
): Promise<void> => {
  try {
    await waitForAdena()
  } catch {
    return
  }
  try {
    window.adena?.On?.('changedNetwork', cb)
  } catch (e) {
    console.warn('[adena] onNetworkChange subscribe failed', e)
  }
}

const onAccountChange = async (
  cb: (address: string) => void
): Promise<void> => {
  try {
    await waitForAdena()
  } catch {
    return
  }
  try {
    window.adena?.On?.('changedAccount', cb)
  } catch (e) {
    console.warn('[adena] onAccountChange subscribe failed', e)
  }
}

const disconnect = (): void => {
  if (sdkInstance) {
    sdkInstance.disconnectWallet()
  }
}

export { ADENA_APP_URL }
export default {
  connect,
  disconnect,
  checkInstalled,
  restore,
  establish,
  addNetwork,
  switchNetwork,
  ensureNetwork,
  onNetworkChange,
  onAccountChange,
  ADENA_APP_URL,
}
