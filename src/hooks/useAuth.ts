import { useSetRecoilState } from 'recoil'

import AuthStore from 'store/AuthStore'
import NetworkStore from 'store/NetworkStore'
import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

import { GnoWallet, EvmWallet } from 'types/auth'
import { BlockChainType } from 'types/network'
import { WalletEnum } from 'types/wallet'

enum LocalStorageKey {
  lastFromBlockChain = 'lastFromBlockChain',
  lastToBlockChain = 'lastToBlockChain',
  lastWalletType = 'lastWalletType',
}

const useAuth = (): {
  loginGno: (wallet: GnoWallet) => Promise<void>
  loginEvm: (wallet: EvmWallet) => Promise<void>
  disconnectGno: () => void
  disconnectEvm: () => void
  disconnectAll: () => void
  getLoginStorage: () => {
    lastFromBlockChain?: BlockChainType
    lastToBlockChain?: BlockChainType
    lastWalletType?: string
  }
  setBlockchainStorage: (props: {
    fromBlockChain: BlockChainType
    toBlockChain: BlockChainType
  }) => void
} => {
  const setGnoWallet = useSetRecoilState(AuthStore.gnoWallet)
  const setEvmWallet = useSetRecoilState(AuthStore.evmWallet)
  const setEvmNetwork = useSetRecoilState(NetworkStore.evmNetwork)
  const setAdenaExt = useSetRecoilState(NetworkStore.adenaExt)
  const setIsVisibleNotSupportNetworkModal = useSetRecoilState(
    NetworkStore.isVisibleNotSupportNetworkModal
  )
  const setStatus = useSetRecoilState(SendProcessStore.sendProcessStatus)

  const loginGno = async (wallet: GnoWallet): Promise<void> => {
    if (wallet.chainId) {
      setAdenaExt({
        chainID: wallet.chainId,
        name: wallet.networkName || wallet.chainId,
      })
      setGnoWallet(wallet)
      localStorage.setItem(LocalStorageKey.lastWalletType, WalletEnum.Adena)
    } else {
      setIsVisibleNotSupportNetworkModal(true)
    }
  }

  const loginEvm = async (wallet: EvmWallet): Promise<void> => {
    const chainId = await wallet.walletClient?.getChainId()
    if (chainId) {
      setEvmNetwork({ chainId, name: 'Ethereum' })
      setEvmWallet(wallet)
      localStorage.setItem(LocalStorageKey.lastWalletType, wallet.walletType)
    } else {
      setIsVisibleNotSupportNetworkModal(true)
    }
  }

  const disconnectGno = (): void => {
    setGnoWallet(null)
    setAdenaExt(undefined)
  }

  const disconnectEvm = (): void => {
    setEvmWallet(null)
    setEvmNetwork(undefined)
  }

  const disconnectAll = (): void => {
    disconnectGno()
    disconnectEvm()
    setStatus(ProcessStatus.Input)
    localStorage.removeItem(LocalStorageKey.lastWalletType)
  }

  const setBlockchainStorage = (props: {
    fromBlockChain: BlockChainType
    toBlockChain: BlockChainType
  }): void => {
    localStorage.setItem(
      LocalStorageKey.lastFromBlockChain,
      props.fromBlockChain
    )
    localStorage.setItem(LocalStorageKey.lastToBlockChain, props.toBlockChain)
  }

  const getLoginStorage = (): {
    lastFromBlockChain?: BlockChainType
    lastToBlockChain?: BlockChainType
    lastWalletType?: string
  } => {
    return {
      lastFromBlockChain: (localStorage.getItem(
        LocalStorageKey.lastFromBlockChain
      ) || undefined) as BlockChainType | undefined,
      lastToBlockChain: (localStorage.getItem(
        LocalStorageKey.lastToBlockChain
      ) || undefined) as BlockChainType | undefined,
      lastWalletType:
        localStorage.getItem(LocalStorageKey.lastWalletType) || undefined,
    }
  }

  return {
    loginGno,
    loginEvm,
    disconnectGno,
    disconnectEvm,
    disconnectAll,
    getLoginStorage,
    setBlockchainStorage,
  }
}

export default useAuth
