import { useRecoilValue } from 'recoil'
import { erc20Abi } from 'viem'

import { getEvmPublicClient } from 'config/wagmi'
import AuthStore from 'store/AuthStore'
import NetworkStore from 'store/NetworkStore'
import SendStore from 'store/SendStore'

import { WhiteListType, BalanceListType } from 'types/asset'
import { isEvmChain } from 'types/network'
import { pickEvmChain } from 'packages/union/evm-chains'
import { isNativeEvmToken } from 'packages/union/gno-zkgm-constants'

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

    const chain = pickEvmChain(evmNetwork?.chainId)
    const publicClient = getEvmPublicClient(chain.id)

    const list: BalanceListType = {}
    await Promise.all(
      whiteList.map(async (token) => {
        try {
          const balance = isNativeEvmToken(token)
            ? await publicClient.getBalance({
                address: userAddress as `0x${string}`,
              })
            : await publicClient.readContract({
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
