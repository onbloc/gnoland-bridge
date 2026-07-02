export enum AssetDenomEnum {
  ugnot = 'ugnot',
  wugnot = 'wugnot',
  // GRC20 tokens minted via the grc20factory realm are identified by their
  // grc20reg registry key, '<pkgPath>.<symbol>' (see
  // gno.land/p/nt/fqname's Construct), since BalanceOf on that realm takes
  // the symbol as an argument (see useGnoBalance.ts's fetchGrc20Balance).
  foo = 'gno.land/r/demo/defi/grc20factory.FOO',
  wfoo = 'wfoo',
  // AtomOne is selectable but not wired to any balance fetch or send path yet
  // (see consts/routes.ts) - balance always displays as 0.
  uatone = 'uatone',
}

export enum AssetSymbolEnum {
  GNOT = 'GNOT',
  wGNOT = 'wGNOT',
  FOO = 'FOO',
  wFOO = 'wFOO',
  ATONE = 'ATONE',
}

export const ASSET_DECIMALS: Record<AssetDenomEnum, number> = {
  [AssetDenomEnum.ugnot]: 6,
  [AssetDenomEnum.wugnot]: 6,
  [AssetDenomEnum.foo]: 6,
  [AssetDenomEnum.wfoo]: 6,
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
import fooSvg from 'images/foo.svg'
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
    symbol: AssetSymbolEnum.FOO,
    denom: AssetDenomEnum.foo,
    name: 'FooToken',
    logoURI: fooSvg,
    decimals: 6,
  },
  {
    symbol: AssetSymbolEnum.wFOO,
    denom: AssetDenomEnum.wfoo,
    name: 'Wrapped FooToken (Sepolia)',
    logoURI: fooSvg,
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
