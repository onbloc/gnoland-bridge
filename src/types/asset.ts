export enum AssetDenomEnum {
  ugnot = 'ugnot',
  wugnot = 'wugnot',
  grct = 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
  wgrct = 'wgrct',
  // AtomOne is selectable but not wired to any balance fetch or send path yet
  // (see consts/routes.ts) - balance always displays as 0.
  uatone = 'uatone',
}

export enum AssetSymbolEnum {
  GNOT = 'GNOT',
  wGNOT = 'wGNOT',
  GRCT = 'GRCT',
  wGRCT = 'wGRCT',
  ATONE = 'ATONE',
}

export const ASSET_DECIMALS: Record<AssetDenomEnum, number> = {
  [AssetDenomEnum.ugnot]: 6,
  [AssetDenomEnum.wugnot]: 6,
  [AssetDenomEnum.grct]: 6,
  [AssetDenomEnum.wgrct]: 6,
  [AssetDenomEnum.uatone]: 6,
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
import grctSvg from 'images/grct.svg'
import atomoneSvg from 'images/atomone.svg'

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
  {
    symbol: AssetSymbolEnum.GRCT,
    denom: AssetDenomEnum.grct,
    name: 'GRCToken',
    logoURI: grctSvg,
    decimals: 6,
  },
  {
    symbol: AssetSymbolEnum.wGRCT,
    denom: AssetDenomEnum.wgrct,
    name: 'Wrapped GRCToken (Sepolia)',
    logoURI: grctSvg,
    decimals: 6,
  },
  {
    symbol: AssetSymbolEnum.ATONE,
    denom: AssetDenomEnum.uatone,
    name: 'AtomOne',
    logoURI: atomoneSvg,
    decimals: 6,
  },
]
