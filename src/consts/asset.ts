import { AssetSymbolEnum, AssetDenomEnum } from 'types/asset'

const GNOT_DECIMAL = 1e6
const ETHER_BASE_DECIMAL = 1e18

const symbolOfDenom: Record<AssetDenomEnum, AssetSymbolEnum> = {
  [AssetDenomEnum.ugnot]: AssetSymbolEnum.GNOT,
  [AssetDenomEnum.wugnot]: AssetSymbolEnum.wGNOT,
  [AssetDenomEnum.foo]: AssetSymbolEnum.FOO,
  [AssetDenomEnum.wfoo]: AssetSymbolEnum.wFOO,
}

export default {
  symbolOfDenom,
  GNOT_DECIMAL,
  ETHER_BASE_DECIMAL,
}
