import { WalletClient } from 'viem'
import { SigningStargateClient } from '@cosmjs/stargate'
import { WalletEnum } from './wallet'

export type GnoWallet = {
  address: string
  chainId: string
  publicKey?: string
  signer?: SigningStargateClient
  walletType: WalletEnum.Adena
  networkName?: string
  rpcUrl?: string
}

export type EvmWallet = {
  address: string
  walletClient: WalletClient
  walletType: WalletEnum.MetaMask
}

// Legacy User type for backward compat during transition
export type User = {
  address: string
  walletClient?: WalletClient
  signer?: SigningStargateClient
  walletType: WalletEnum
}
