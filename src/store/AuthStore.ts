import { atom, selector } from 'recoil'

import { GnoWallet, EvmWallet } from 'types/auth'
import { isGnoChain } from 'types/network'

import SendStore from './SendStore'

const gnoWallet = atom<GnoWallet | null>({
  key: 'gnoWallet',
  default: null,
  dangerouslyAllowMutability: true,
})

const evmWallet = atom<EvmWallet | null>({
  key: 'evmWallet',
  default: null,
  dangerouslyAllowMutability: true,
})

const isLoggedIn = selector({
  key: 'isLoggedIn',
  get: ({ get }): boolean => {
    const fromBlockChain = get(SendStore.fromBlockChain)
    if (isGnoChain(fromBlockChain)) {
      return !!get(gnoWallet)
    }
    return !!get(evmWallet)
  },
})

const isFullyConnected = selector({
  key: 'isFullyConnected',
  get: ({ get }): boolean => {
    return !!get(gnoWallet) && !!get(evmWallet)
  },
})

export default {
  gnoWallet,
  evmWallet,
  isLoggedIn,
  isFullyConnected,
}
