export enum AssetDenomEnum {
  ugnot = 'ugnot',
  wugnot = 'wugnot',
  grct = 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
  wgrct = 'wgrct',
  // ERCT originates on Ethereum (base ERC20); the value here is its wrapped
  // voucher denom on gno (tracked by the zkgm realm, not a standalone GRC20
  // realm) - mirrors grct/ugnot in always being the gno-side identifier.
  // No send path yet - see consts/routes.ts.
  erctoken = 'ibc/ab48a434e034509a65fc52a24388c05f628dcc15',
  // USDT originates on Ethereum (existing Sepolia USDT deployment, not a
  // fresh one - see consts/routes.ts USDT_SEPOLIA). The value here is its
  // wrapped voucher denom on gno (tracked by the zkgm realm, not a
  // standalone GRC20 realm) - mirrors erctoken above.
  usdt = 'ibc/8908315ff52040c1cb74d0573c5f9e58de598971',
  // AtomOne is selectable but not wired to any balance fetch or send path yet
  // (see consts/routes.ts) - balance always displays as 0.
  uatone = 'uatone',
}

export enum AssetSymbolEnum {
  GNOT = 'GNOT',
  wGNOT = 'wGNOT',
  GRCT = 'GRCT',
  wGRCT = 'wGRCT',
  ERCT = 'ERCT',
  USDT = 'USDT',
  ATONE = 'ATONE',
}

export const ASSET_DECIMALS: Record<AssetDenomEnum, number> = {
  [AssetDenomEnum.ugnot]: 6,
  [AssetDenomEnum.wugnot]: 6,
  [AssetDenomEnum.grct]: 6,
  [AssetDenomEnum.wgrct]: 6,
  [AssetDenomEnum.erctoken]: 18,
  [AssetDenomEnum.usdt]: 6,
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
import ethereumSvg from 'images/ethereum.svg'
import usdtSvg from 'images/usdt.svg'

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
    symbol: AssetSymbolEnum.ERCT,
    denom: AssetDenomEnum.erctoken,
    // TODO: replace with a dedicated ERCT icon once available.
    name: 'ERCToken',
    logoURI: ethereumSvg,
    decimals: 18,
  },
  {
    symbol: AssetSymbolEnum.USDT,
    denom: AssetDenomEnum.usdt,
    name: 'Tether USD',
    logoURI: usdtSvg,
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
