import { BlockChainType, isEvmChain, EVM_CHAIN_IDS } from 'types/network'
import GnotSvg from 'images/gnot.svg'
import EthereumSvg from 'images/ethereum.svg'
import AtomOneSvg from 'images/atomone.svg'

const blockChainImage: Record<BlockChainType, string> = {
  [BlockChainType.gnoland]: GnotSvg,
  [BlockChainType.ethereum]: EthereumSvg,
  [BlockChainType.atomone]: AtomOneSvg,
}

const blockChainName: Record<BlockChainType, string> = {
  [BlockChainType.gnoland]: 'Gno.land',
  [BlockChainType.ethereum]: 'Ethereum',
  [BlockChainType.atomone]: 'AtomOne',
}

const evmRpc: Record<string, string[]> = {
  [BlockChainType.ethereum]: ['https://eth.llamarpc.com'],
}

function isEtherBaseBlockChain(blockChain: BlockChainType): boolean {
  return isEvmChain(blockChain)
}

const ADENA_EXTENSION = 'https://www.adena.app/'

export default {
  blockChainImage,
  blockChainName,
  evmRpc,
  isEtherBaseBlockChain,
  EVM_CHAIN_IDS,
  ADENA_EXTENSION,
}
