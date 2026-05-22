export type RequestTxResultType =
  | {
      success: true
      hash: string
      packetHash?: string
    }
  | {
      success: false
      errorMessage?: string
    }

export type PacketStatus =
  | 'PACKET_SEND'
  | 'PACKET_RECV'
  | 'WRITE_ACK'
  | 'PACKET_ACK'

export type ValidateItemResultType = {
  isValid: boolean
  errorMessage?: string
}

export type ValidateResultType = {
  isValid: boolean
  errorMessage?: {
    toAddress?: string
    amount?: string
  }
}
