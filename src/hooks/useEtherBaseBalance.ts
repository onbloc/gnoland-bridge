import { useRecoilValue } from 'recoil'
import { createPublicClient, custom, erc20Abi, http } from 'viem'

import AuthStore from 'store/AuthStore'
import NetworkStore from 'store/NetworkStore'
import SendStore from 'store/SendStore'

import { WhiteListType, BalanceListType } from 'types/asset'
import { isEvmChain } from 'types/network'
import { pickEvmChain, sepoliaRpcUrl } from 'packages/union/evm-chains'

const useEtherBaseBalance = (): {
  getEtherBalances: ({
    whiteList,
  }: {
    whiteList: WhiteListType
  }) => Promise<BalanceListType>
} => {
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const evmNetwork = useRecoilValue(NetworkStore.evmNetwork)

  const getEtherBalances = async ({
    whiteList,
  }: {
    whiteList: WhiteListType
  }): Promise<BalanceListType> => {
    const userAddress = evmWallet?.address
    if (!userAddress || !isEvmChain(fromBlockChain)) {
      return {}
    }

    const chain = pickEvmChain(fromBlockChain, evmNetwork?.chainId)
    // Sepolia balance reads use an HTTP transport against the configured RPC
    // even when MetaMask is still on mainnet, so the wugnot row populates
    // before the user runs the switchChain prompt. Mainnet/Base keep the
    // injected provider for parity with the existing flow.
    const useInjected =
      !!window.ethereum && chain.id === (evmNetwork?.chainId ?? chain.id)
    const publicClient = createPublicClient({
      chain,
      transport: useInjected
        ? custom(window.ethereum!)
        : http(chain.id === 11155111 ? sepoliaRpcUrl() : undefined),
    })

    const list: BalanceListType = {}
    await Promise.all(
      whiteList.map(async (token) => {
        try {
          const balance = await publicClient.readContract({
            address: token as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress as `0x${string}`],
          })
          list[token] = balance.toString()
        } catch (e) {
          console.error(`Failed to fetch balance for ${token}:`, e)
          list[token] = '0'
        }
      })
    )
    return list
  }

  return { getEtherBalances }
}

export default useEtherBaseBalance
