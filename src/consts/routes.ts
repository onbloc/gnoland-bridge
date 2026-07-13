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
// channel 40 (gno ch 1).
const WRAPPED_GRCT_SEPOLIA =
  import.meta.env.VITE_WRAPPED_GRCT_SEPOLIA ||
  '0x2B11dF653B0A5B91864274662464D323117084Ee'

// ERCT (ERCToken) - base ERC20 lives on Ethereum this time; the wrapped
// representation on gno is an IBC-hash denom produced by the separate init
// script, not through this frontend.
const ERCT_SEPOLIA =
  import.meta.env.VITE_ERCT_SEPOLIA ||
  '0x3128D525320aa5C07b1cef3d413DA0299f03946E'
const WRAPPED_ERCT_GNO =
  import.meta.env.VITE_WRAPPED_ERCT_GNO ||
  'ibc/ab48a434e034509a65fc52a24388c05f628dcc15'

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
    dest_channel: '40',
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
    source_channel: '40',
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
    dest_channel: '40',
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
    source_channel: '40',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  // ERCT: base ERC20 on Ethereum, wrapped GRC20 on gno (reverse of the GRCT
  // pair above). No wired send path yet - useBridge.ts hardcodes ESCROW for
  // every gno->eth direct send and UNESCROW for every eth->gno direct send,
  // which is backwards for a token whose base lives on Ethereum. These
  // entries are config-only until matching eth->gno ESCROW / gno->eth
  // UNESCROW builders exist.
  {
    src: 'ethereum',
    dest: 'gnoland',
    denom: 'erctoken',
    chain_id: '11155111',
    baseToken: ERCT_SEPOLIA,
    quoteToken: WRAPPED_ERCT_GNO,
    source_channel: '40',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'gnoland',
    dest: 'ethereum',
    denom: 'erctoken',
    chain_id: import.meta.env.VITE_GNO_CHAIN_ID || 'dev.ibc',
    baseToken: WRAPPED_ERCT_GNO,
    quoteToken: ERCT_SEPOLIA,
    source_channel: '1',
    dest_channel: '40',
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
