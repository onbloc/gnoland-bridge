export enum AssetDenomEnum {
  ugnot = 'ugnot',
  wugnot = 'wugnot',
}

export enum AssetSymbolEnum {
  GNOT = 'GNOT',
  wGNOT = 'wGNOT',
}

export const ASSET_DECIMALS: Record<AssetDenomEnum, number> = {
  [AssetDenomEnum.ugnot]: 6,
  [AssetDenomEnum.wugnot]: 6,
}

export type AssetType = {
  symbol: AssetSymbolEnum
  denom: AssetDenomEnum
  name: string
  logoURI: string
  decimals: number
  balance?: string
  disabled?: boolean
}

export type WhiteListType = string[]
export type BalanceListType = Record<string, string>

import gnotSvg from 'images/gnot.svg'

export const SUPPORTED_ASSETS: AssetType[] = [
  {
    symbol: AssetSymbolEnum.GNOT,
    denom: AssetDenomEnum.ugnot,
    name: 'Gno.land',
    logoURI: gnotSvg,
    decimals: 6,
  },
  {
    symbol: AssetSymbolEnum.wGNOT,
    denom: AssetDenomEnum.wugnot,
    name: 'Wrapped Gno.land (Sepolia)',
    logoURI: gnotSvg,
    decimals: 6,
  },
]
