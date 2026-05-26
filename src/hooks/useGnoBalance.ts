import { useRecoilValue } from 'recoil'

import AuthStore from 'store/AuthStore'

import { WhiteListType, BalanceListType } from 'types/asset'
import { resolveGnoNetwork } from 'consts/gnoNetworks'

// Mirrors @gnolang/tm2-js-client's `getBalance`: POST a JSON-RPC envelope
// with method `abci_query` and path `bank/balances/{addr}`. The GET form
// (`/abci_query?path=...`) is unreliable on Gno.land nodes (often returns
// empty Data), so the POST form is the safe path.
const fetchCoinList = async (rpc: string, address: string): Promise<string> => {
  if (!address) return ''
  const url = rpc.replace(/\/$/, '')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'abci_query',
      params: [`bank/balances/${address}`, '', '0', false],
    }),
  })
  if (!res.ok) {
    throw new Error(`Gno.land RPC ${res.status}`)
  }

  const json = await res.json()
  const encoded: string | undefined = json?.result?.response?.ResponseBase?.Data
  if (!encoded) return ''

  // Response Data is a base64-encoded JSON string literal
  // (e.g. '"15000000ugnot,500uphoton"'). Strip the outer quotes so the
  // comma-split below produces clean coin entries.
  return atob(encoded).replace(/"/g, '')
}

const parseCoinAmount = (coinList: string, denom: string): string => {
  if (!coinList) return '0'

  const pattern = new RegExp(`^(\\d+)${denom}$`)
  for (const part of coinList.split(',')) {
    const m = part.trim().match(pattern)
    if (m) return m[1]
  }
  return '0'
}

const useGnoBalance = (): {
  getGnoBalances: ({
    whiteList,
  }: {
    whiteList: WhiteListType
  }) => Promise<BalanceListType>
} => {
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)

  const getGnoBalances = async ({
    whiteList,
  }: {
    whiteList: WhiteListType
  }): Promise<BalanceListType> => {
    const userAddress = gnoWallet?.address || ''
    const chainId = gnoWallet?.chainId
    const list: BalanceListType = {}
    const zeroFill = (): BalanceListType => {
      for (const token of whiteList) list[token] = '0'
      return list
    }

    if (!userAddress) return zeroFill()

    // Static registry wins so devnet stays consistent even when Adena
    // reports a stale rpcUrl (e.g. user edited Local network but hasn't
    // saved, or extension still holds an old localhost value). Wallet
    // rpcUrl is used only as a last resort for chains we don't ship.
    const rpc = resolveGnoNetwork(chainId)?.rpcUrl || gnoWallet?.rpcUrl
    if (!rpc) {
      console.warn(`Unsupported Gno.land chain: ${chainId ?? '(none)'}`)
      return zeroFill()
    }

    console.log('[gno-balance] fetching', {
      rpc,
      walletRpcUrl: gnoWallet?.rpcUrl,
      chainId,
      userAddress,
      whiteList,
    })

    try {
      const coinList = await fetchCoinList(rpc, userAddress)
      console.log('[gno-balance] received', { rpc, coinList })
      for (const token of whiteList) {
        list[token] = parseCoinAmount(coinList, token)
      }
    } catch (e) {
      console.error('Failed to fetch Gno.land balances:', e, { rpc, chainId })
      return zeroFill()
    }

    return list
  }

  return {
    getGnoBalances,
  }
}

export default useGnoBalance
