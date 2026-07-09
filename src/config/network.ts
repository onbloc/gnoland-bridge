export const GNOSCAN_URL = 'https://gnoscan.io'

export const GNO_RPC_URL = import.meta.env.VITE_GNO_RPC_URL || 'https://rpc.bridge.onbloc.xyz'

export const makeGnoscanTransactionUrl = (txHash: string): string => {
  const params = new URLSearchParams({
    type: 'custom',
    rpcUrl: GNO_RPC_URL,
    txhash: txHash,
  })

  return `${GNOSCAN_URL}/transactions/details?${params.toString()}`
}