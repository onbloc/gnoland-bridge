// 'osmosis-hook'  legacy 2-hop via Osmosis wasm-hook intermediary
//                 (a1-eth-hook / eth-a1-hook). Default when unspecified.
// 'gno-direct'    single-hop via Gno-side ZKGM realm (gno-eth-zkgm).
//                 Requires gno-ibc deployment + VITE_GNO_DIRECT_ZKGM=true.
export type BridgeVia = 'osmosis-hook' | 'gno-direct'

export type BridgeRoute = {
  src: string
  dest: string
  denom: string
  chain_id: string
  baseToken: string
  quoteToken: string
  source_channel: string
  dest_channel: string
  metadata: string
  via?: BridgeVia
}

// Wrapped ugnot predicted by predictWrappedTokenV2 for channel 33 (gno ch 1).
const WRAPPED_UGNOT_SEPOLIA =
  import.meta.env.VITE_WRAPPED_UGNOT_SEPOLIA ||
  '0xAdD526520802023E7b80b3636864B24628De9d71'

// gno-direct routes exercise the TokenOrderV2 (OP_TOKEN_ORDER) path. The
// ESCROW route sends ugnot from gno and mints wrapped-ugnot on Sepolia; the
// UNESCROW route burns wrapped-ugnot on Sepolia and releases ugnot back on
// gno. Both directions must use the wrapped ERC20 created by INITIALIZE.
const routes: BridgeRoute[] = [
  {
    src: 'gnoland',
    dest: 'ethereum',
    denom: 'ugnot',
    chain_id: import.meta.env.VITE_GNO_CHAIN_ID || 'dev',
    baseToken: 'ugnot',
    quoteToken: WRAPPED_UGNOT_SEPOLIA,
    source_channel: '1',
    dest_channel: '33',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'ethereum',
    dest: 'gnoland',
    denom: 'wugnot',
    chain_id: '11155111',
    baseToken: WRAPPED_UGNOT_SEPOLIA,
    quoteToken: 'ugnot',
    source_channel: '33',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
]

export default routes
