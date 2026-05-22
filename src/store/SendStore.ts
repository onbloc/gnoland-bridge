import { atom } from 'recoil'

import { AssetType } from 'types/asset'
import { BlockChainType } from 'types/network'
import { PacketStatus, ValidateResultType } from 'types/send'

const asset = atom<AssetType | undefined>({
  key: 'sendAsset',
  default: undefined,
})

const toAddress = atom<string>({
  key: 'sendToAddress',
  default: '',
})

const amount = atom<string>({
  key: 'sendAmount',
  default: '',
})

const fromBlockChain = atom<BlockChainType>({
  key: 'sendFromBlockChain',
  default: BlockChainType.gnoland,
})

const toBlockChain = atom<BlockChainType>({
  key: 'sendToBlockChain',
  default: BlockChainType.ethereum,
})

const packetHash = atom<string>({
  key: 'sendPacketHash',
  default: '',
})

const packetStatus = atom<PacketStatus | undefined>({
  key: 'sendPacketStatus',
  default: undefined,
})

const validationResult = atom<ValidateResultType>({
  key: 'sendValidationResult',
  default: { isValid: false },
})

export default {
  asset,
  toAddress,
  amount,
  fromBlockChain,
  toBlockChain,
  packetHash,
  packetStatus,
  validationResult,
}
