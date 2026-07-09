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

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

const parseCoinAmount = (coinList: string, denom: string): string => {
  if (!coinList || !denom) return '0'

  const pattern = new RegExp(`^(\\d+)${escapeRegExp(denom)}$`)
  for (const part of coinList.split(',')) {
    const m = part.trim().match(pattern)
    if (m) return m[1]
  }
  return '0'
}

// GRC20 tokens are identified by their realm package path (e.g.
// 'gno.land/r/g1jg8.../grct'), which always contains a '/'. Native coin
// denoms (ugnot, wugnot) never do, so this is enough to route each whiteList
// entry to the right query. Multi-token factory realms (which manage
// several symbols behind one pkgpath) register each token under grc20reg
// using fqname's '<pkgPath>.<symbol>' key, since BalanceOf there takes the
// symbol as an extra argument; single-token realms take just the address.
const isGrc20PkgPath = (token: string): boolean => token.includes('/')

// Splits a grc20reg-style '<pkgPath>.<symbol>' key back into its parts. The
// dot must be looked for after the last '/' — pkgPath itself always
// contains a dot (the 'gno.land' domain prefix), so a naive last-dot split
// would cut the domain instead of the appended symbol.
const parseGrc20Token = (
  token: string
): { pkgPath: string; symbol?: string } => {
  const lastSlash = token.lastIndexOf('/')
  const dotIndex = token.indexOf('.', lastSlash + 1)
  if (dotIndex === -1) return { pkgPath: token }
  return { pkgPath: token.slice(0, dotIndex), symbol: token.slice(dotIndex + 1) }
}

// Reads a GRC20 balance via the realm's BalanceOf function using `vm/qeval`,
// which returns the plain string result of the expression (e.g. '"1000000"')
// rather than the JSON-encoded form `vm/qeval_json` uses.
const fetchGrc20Balance = async (
  rpc: string,
  token: string,
  address: string
): Promise<string> => {
  if (!address) return '0'
  const url = rpc.replace(/\/$/, '')
  const { pkgPath, symbol } = parseGrc20Token(token)
  const expression = symbol
    ? `BalanceOf("${symbol}", "${address}")`
    : `BalanceOf("${address}")`

  // abci_query's `data` param must be base64-encoded (Tendermint2 RPC
  // rejects raw text with "illegal base64 data") - this is what `gnokey
  // query -data '...'` does under the hood before it hits the wire.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'abci_query',
      params: ['vm/qeval', btoa(`${pkgPath}.${expression}`), '0', false],
    }),
  })
  if (!res.ok) {
    throw new Error(`Gno.land RPC ${res.status}`)
  }

  const json = await res.json()
  const encoded: string | undefined = json?.result?.response?.ResponseBase?.Data
  if (!encoded) return '0'

  // qeval renders results in Gno's repl syntax, e.g. '(999999999000000 int64)'
  // or '("1000000" string)' - pull the digits out rather than assuming the
  // whole decoded body is a bare number.
  const decoded = atob(encoded).trim()
  const match = decoded.match(/\d+/)
  return match ? match[0] : '0'
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

    const nativeDenoms = whiteList.filter((token) => !isGrc20PkgPath(token))
    const grc20Tokens = whiteList.filter((token) => isGrc20PkgPath(token))

    try {
      const coinList = await fetchCoinList(rpc, userAddress)
      console.log('[gno-balance] received', { rpc, coinList })
      for (const denom of nativeDenoms) {
        list[denom] = parseCoinAmount(coinList, denom)
      }
    } catch (e) {
      console.error('Failed to fetch Gno.land coin balances:', e, {
        rpc,
        chainId,
      })
      for (const denom of nativeDenoms) list[denom] = '0'
    }

    await Promise.all(
      grc20Tokens.map(async (token) => {
        try {
          list[token] = await fetchGrc20Balance(rpc, token, userAddress)
        } catch (e) {
          console.error('Failed to fetch GRC20 balance:', e, {
            rpc,
            chainId,
            token,
          })
          list[token] = '0'
        }
      })
    )

    return list
  }

  return {
    getGnoBalances,
  }
}

export default useGnoBalance
