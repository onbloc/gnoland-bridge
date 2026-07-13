import { useRecoilValue, useSetRecoilState } from 'recoil'
import BigNumber from 'bignumber.js'

import { ASSET } from 'consts'
import SendStore from 'store/SendStore'
import ContractStore from 'store/ContractStore'
import AuthStore from 'store/AuthStore'

import { SUPPORTED_ASSETS, ASSET_DECIMALS, AssetType } from 'types/asset'
import { isGnoChain, isEvmChain } from 'types/network'
import routes from 'consts/routes'

import useGnoBalance from './useGnoBalance'
import useEtherBaseBalance from './useEtherBaseBalance'

const useAsset = (): {
  getAssetList: () => Promise<void>
  formatBalance: (balance: string | BigNumber, coin?: string) => string
  getDecimals: (coin?: string) => number
} => {
  const asset = useRecoilValue(SendStore.asset)
  const setAsset = useSetRecoilState(SendStore.asset)
  const assetList = useRecoilValue(ContractStore.assetList)
  const setAssetList = useSetRecoilState(ContractStore.assetList)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)

  const { getGnoBalances } = useGnoBalance()
  const { getEtherBalances } = useEtherBaseBalance()

  const getAssetList = async (): Promise<void> => {
    // Filter the asset list per source chain. routes.ts is the source of truth
    // for which denoms can legitimately leave a given chain; SUPPORTED_ASSETS
    // is a superset (ugnot leaves gno, wugnot leaves ethereum).
    const routesFromChain = routes.filter(
      (r) => r.src.toLowerCase() === fromBlockChain.toLowerCase()
    )
    const allowedDenoms = new Set(routesFromChain.map((r) => r.denom))
    // baseToken/baseDecimals describe the token as held on `r.src` - i.e.
    // fromBlockChain - so this is the correct decimals for the raw balance
    // we're about to fetch, which can differ from SUPPORTED_ASSETS' static
    // decimals when a token's two sides aren't 1:1 (e.g. ERCT: 18 on its
    // native EVM ERC20, rescaled to 6 in its gno voucher).
    const visibleAssets = SUPPORTED_ASSETS.filter((a) =>
      allowedDenoms.has(a.denom)
    ).map((a) => {
      const route = routesFromChain.find((r) => r.denom === a.denom)
      return route ? { ...a, decimals: route.baseDecimals } : a
    })

    let updatedAssets: AssetType[] = visibleAssets.map((a) => ({
      ...a,
      balance: undefined,
    }))

    try {
      if (isGnoChain(fromBlockChain) && gnoWallet) {
        const whiteList = visibleAssets.map((a) => a.denom)
        const balances = await getGnoBalances({ whiteList })
        updatedAssets = visibleAssets.map((a) => ({
          ...a,
          balance: balances[a.denom] || '0',
        }))
      } else if (isEvmChain(fromBlockChain) && evmWallet) {
        const denomToContract: Record<string, string> = {}
        for (const r of routes) {
          if (
            r.src.toLowerCase() === fromBlockChain.toLowerCase() &&
            r.baseToken.startsWith('0x')
          ) {
            denomToContract[r.denom] = r.baseToken
          }
        }

        const contractAddresses = Object.values(denomToContract)
        if (contractAddresses.length > 0) {
          const balances = await getEtherBalances({
            whiteList: contractAddresses,
          })
          updatedAssets = visibleAssets.map((a) => {
            const contract = denomToContract[a.denom]
            return {
              ...a,
              balance: contract ? balances[contract] || '0' : '0',
            }
          })
        }
      }
    } catch (e) {
      console.error('Failed to fetch balances:', e)
    }

    setAssetList(updatedAssets)

    const currentDenom = asset?.denom
    const selectedAsset = currentDenom
      ? updatedAssets.find((a) => a.denom === currentDenom) || updatedAssets[0]
      : updatedAssets[0]
    setAsset(selectedAsset)
  }

  const getDecimals = (coin?: string): number => {
    const denom = coin || asset?.denom
    if (denom) {
      // Prefer the current (route-resolved) list entry over the static
      // SUPPORTED_ASSETS table, since a token's decimals can depend on
      // which chain it's currently being held/sent from (see getAssetList).
      const decimals =
        assetList.find((a) => a.denom === denom)?.decimals ??
        ASSET_DECIMALS[denom as keyof typeof ASSET_DECIMALS]
      if (decimals !== undefined) {
        return Math.pow(10, decimals)
      }
    }
    return ASSET.GNOT_DECIMAL
  }

  const formatBalance = (
    balance: string | BigNumber,
    coin?: string
  ): string => {
    if (balance) {
      const bnBalance =
        typeof balance === 'string' ? new BigNumber(balance) : balance

      const decimals = getDecimals(coin)
      return bnBalance
        .div(decimals / ASSET.GNOT_DECIMAL)
        .integerValue(BigNumber.ROUND_DOWN)
        .div(ASSET.GNOT_DECIMAL)
        .dp(6)
        .toString(10)
    }

    return ''
  }

  return {
    getAssetList,
    formatBalance,
    getDecimals,
  }
}

export default useAsset
