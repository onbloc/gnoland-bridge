import { WRAPPED_UGNOT_SEPOLIA } from 'packages/union/gno-zkgm-constants'

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

// Wrapped GRCT (gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct), created via a Gno->Eth INITIALIZE for
// channel 39 (gno ch 1).
const WRAPPED_GRCT_SEPOLIA =
  import.meta.env.VITE_WRAPPED_GRCT_SEPOLIA ||
  '0x852fc6095740090e296946192f7F8836b21F7F5b'

// gno-direct routes exercise the TokenOrderV2 (OP_TOKEN_ORDER) path. The
// ESCROW route sends ugnot from gno and mints wrapped-ugnot on Sepolia; the
// UNESCROW route burns wrapped-ugnot on Sepolia and releases ugnot back on
// gno. Both directions must use the wrapped ERC20 created by INITIALIZE.
const routes: BridgeRoute[] = [
  {
    src: 'gnoland',
    dest: 'ethereum',
    denom: 'ugnot',
    chain_id: import.meta.env.VITE_GNO_CHAIN_ID || 'dev.ibc',
    baseToken: 'ugnot',
    quoteToken: WRAPPED_UGNOT_SEPOLIA,
    source_channel: '1',
    dest_channel: '39',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'ethereum',
    dest: 'gnoland',
    denom: 'ugnot',
    chain_id: '11155111',
    baseToken: WRAPPED_UGNOT_SEPOLIA,
    quoteToken: 'ugnot',
    source_channel: '39',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'gnoland',
    dest: 'ethereum',
    denom: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
    chain_id: import.meta.env.VITE_GNO_CHAIN_ID || 'dev.ibc',
    baseToken: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
    quoteToken: WRAPPED_GRCT_SEPOLIA,
    source_channel: '1',
    dest_channel: '39',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'ethereum',
    dest: 'gnoland',
    denom: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
    chain_id: '11155111',
    baseToken: WRAPPED_GRCT_SEPOLIA,
    quoteToken: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
    source_channel: '39',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  // AtomOne is selectable in the network picker but has no wired send path
  // yet - this entry only exists so the asset dropdown isn't empty when
  // AtomOne is the source chain. Balance always shows 0 (see useAsset.ts)
  // and useBridge.ts's fallback safely rejects any send attempt.
  {
    src: 'atomone',
    dest: 'gnoland',
    denom: 'uatone',
    chain_id: 'atomone-1',
    baseToken: 'uatone',
    quoteToken: 'uatone',
    source_channel: '0',
    dest_channel: '0',
    metadata: '0x',
  },
]

export default routes
