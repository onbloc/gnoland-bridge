import { atom } from 'recoil'
import { AssetType, SUPPORTED_ASSETS } from 'types/asset'

const assetList = atom<AssetType[]>({
  key: 'assetList',
  default: SUPPORTED_ASSETS,
})

export default {
  assetList,
}
