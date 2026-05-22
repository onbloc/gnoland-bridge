// Adena `/vm.m_call` message payload for Gno realm function calls with
// primitive arguments. Kept for callers that target wrapper realms.
export type GnoVmCallMessage = {
  type: '/vm.m_call'
  value: {
    caller: string
    send: string
    // Matches `gno.vm.MsgCall` proto. Adena fills a default when omitted.
    max_deposit?: string
    pkg_path: string
    func: string
    args: string[]
  }
}

// Adena `/vm.m_run` message payload. The Gno VM compiles and executes the
// inlined `main` package in-tx. Needed because `zkgm.Send` accepts struct
// arguments (`z.Instruction`) which `/vm.m_call` cannot pass.
export type GnoVmRunMessage = {
  type: '/vm.m_run'
  value: {
    caller: string
    send: string
    // Matches `gno.vm.MsgRun` proto. Adena fills a default when omitted.
    max_deposit?: string
    package: {
      name: 'main'
      path: string
      files: { name: string; body: string }[]
    }
  }
}

export type GnoBroadcastMessage = GnoVmCallMessage | GnoVmRunMessage

export type GnoDirectTxResult = {
  // Cross-chain packet hash for explorer correlation (distinct from the Gno
  // tx hash that Adena returns after broadcast).
  hash: `0x${string}`
  messages: GnoBroadcastMessage[]
  gasFee: number
  gasWanted: number
}
