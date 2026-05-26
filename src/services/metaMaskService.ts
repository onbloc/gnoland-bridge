import { NETWORK } from 'consts'
import { sepoliaChain, sepoliaRpcUrl } from 'packages/union/evm-chains'
import { BlockChainType, EVM_CHAIN_IDS } from 'types/network'

declare global {
  interface Window {
    ethereum?: any
  }
}

const checkInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask
}

const connect = async (): Promise<{
  address: string
  provider: any
}> => {
  const accounts = await window.ethereum?.request({
    method: 'eth_requestAccounts',
  })
  const address = (accounts && accounts[0]) || ''
  return { address, provider: window.ethereum }
}

// Silent reconnect: eth_accounts returns the previously-authorized account
// without prompting. Empty array means the user never authorized this site
// (or revoked it). Mirrors adenaService.restore semantics.
const restore = async (): Promise<{
  address: string
  provider: any
} | null> => {
  if (!checkInstalled()) return null
  try {
    const accounts = await window.ethereum?.request({
      method: 'eth_accounts',
    })
    const address = accounts?.[0]
    if (!address) return null
    return { address, provider: window.ethereum }
  } catch (e) {
    console.warn('[metamask] restore failed', e)
    return null
  }
}

const onAccountsChanged = (cb: (accounts: string[]) => void): void => {
  if (!checkInstalled()) return
  window.ethereum?.on?.('accountsChanged', cb)
}

const onChainChanged = (cb: (chainId: string) => void): void => {
  if (!checkInstalled()) return
  window.ethereum?.on?.('chainChanged', cb)
}

const install = (): void => {
  window.open('https://metamask.io/download/', '_blank')
}

type EvmSwitchTarget = {
  chainId: number
  chainName: string
  rpcUrls: string[]
  nativeCurrency?: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrls?: string[]
}

const formatChainId = (n: number): string => '0x' + n.toString(16)

async function switchChain(target: EvmSwitchTarget): Promise<void> {
  let currentChain
  try {
    currentChain = await window.ethereum?.request({ method: 'eth_chainId' })
  } catch {
    currentChain = window.ethereum?.networkVersion
  }
  /* eslint eqeqeq: "off" */
  if (
    currentChain == target.chainId ||
    currentChain === formatChainId(target.chainId)
  ) {
    return
  }

  try {
    await window.ethereum?.request({
      method: 'wallet_switchEthereumChain',
      params: [
        {
          chainId: formatChainId(target.chainId),
        },
      ],
    })
  } catch (e: any) {
    if (Number(e?.code) === 4902) {
      const addParams: Record<string, unknown> = {
        chainId: formatChainId(target.chainId),
        chainName: target.chainName,
        rpcUrls: target.rpcUrls,
      }
      if (target.nativeCurrency) {
        addParams.nativeCurrency = target.nativeCurrency
      }
      if (target.blockExplorerUrls) {
        addParams.blockExplorerUrls = target.blockExplorerUrls
      }

      await window.ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [addParams],
      })
      await window.ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: formatChainId(target.chainId) }],
      })
    } else {
      throw e instanceof Error ? e : new Error(String(e?.message ?? e))
    }
  }
}

async function addNetworkAndSwitch(
  network: BlockChainType,
  target: number
): Promise<void> {
  await switchChain({
    chainId: target,
    chainName: NETWORK.blockChainName[network],
    rpcUrls: NETWORK.evmRpc[network],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  })
}

const switchNetwork = async (network: BlockChainType): Promise<void> => {
  const chainId = EVM_CHAIN_IDS[network]
  if (chainId) {
    await addNetworkAndSwitch(network, chainId)
  }
}

const switchToSepolia = async (): Promise<void> => {
  const blockExplorer = sepoliaChain.blockExplorers?.default.url
  await switchChain({
    chainId: sepoliaChain.id,
    chainName: sepoliaChain.name,
    rpcUrls: [sepoliaRpcUrl()],
    nativeCurrency: sepoliaChain.nativeCurrency,
    blockExplorerUrls: blockExplorer ? [blockExplorer] : undefined,
  })
}

export default {
  connect,
  restore,
  onAccountsChanged,
  onChainChanged,
  checkInstalled,
  install,
  switchNetwork,
  switchToSepolia,
}
