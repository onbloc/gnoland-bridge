export const GNOSCAN_URL = 'https://gnoscan.io'

export const makeGnoscanTransactionUrl = (txHash: string): string => {
  const params = new URLSearchParams({ txhash: txHash })

  return `${GNOSCAN_URL}/transactions/details?${params.toString()}`
}