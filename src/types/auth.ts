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
  // Name of the connected EIP-6963 wallet/connector (e.g. "MetaMask", "Rabby",
  // "Coinbase Wallet") rather than a fixed enum, since any injected wallet
  // can connect now.
  walletType: string
}

// Legacy User type for backward compat during transition
export type User = {
  address: string
  walletClient?: WalletClient
  signer?: SigningStargateClient
  walletType: WalletEnum
}
