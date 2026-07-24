import {
  TokenOrderKind,
  WRAPPED_UGNOT_SEPOLIA,
} from 'packages/union/gno-zkgm-constants'

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
  // Raw on-chain decimals for baseToken/quoteToken respectively. Usually
  // equal (ugnot/wugnot and grct/wgrct both wrap 1:1 at 6 decimals), but not
  // guaranteed - ERCT's 18-decimal EVM ERC20 is rescaled to a 6-decimal
  // voucher on gno, so its two sides genuinely differ.
  baseDecimals: number
  quoteDecimals: number
  // Which TokenOrderV2 kind this src->dest leg sends. See TokenOrderKind.
  kind: TokenOrderKind
  source_channel: string
  dest_channel: string
  metadata: string
  via?: BridgeVia
}

// Wrapped GRCT (gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct), created via a Gno->Eth INITIALIZE for
// channel 44 (gno ch 1).
const WRAPPED_GRCT_SEPOLIA =
  import.meta.env.VITE_WRAPPED_GRCT_SEPOLIA ||
  '0xE53Fc439c64F1Cb0e9466a3Fdf0d2500Dc0Ee6E5'

// ERCT (ERCToken) - base ERC20 lives on Ethereum this time; the wrapped
// representation on gno is an IBC-hash denom produced by the separate init
// script, not through this frontend.
const ERCT_SEPOLIA =
  import.meta.env.VITE_ERCT_SEPOLIA ||
  '0x3128D525320aa5C07b1cef3d413DA0299f03946E'
const WRAPPED_ERCT_GNO =
  import.meta.env.VITE_WRAPPED_ERCT_GNO ||
  'ibc/ab48a434e034509a65fc52a24388c05f628dcc15'  

// USDT - existing USDT already deployed on Sepolia (not a fresh deployment
// like ERCT above). Wrapped voucher denom on gno created via a separate init
// script, not through this frontend (mirrors ERCT above).
const USDT_SEPOLIA =
  import.meta.env.VITE_USDT_SEPOLIA ||
  '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'
const WRAPPED_USDT_GNO =
  import.meta.env.VITE_WRAPPED_USDT_GNO ||
  'ibc/8908315ff52040c1cb74d0573c5f9e58de598971'

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
    baseDecimals: 6,
    quoteDecimals: 6,
    kind: 'escrow',
    source_channel: '1',
    dest_channel: '44',
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
    baseDecimals: 6,
    quoteDecimals: 6,
    kind: 'unescrow',
    source_channel: '44',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'gnoland',
    dest: 'ethereum',
    denom: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
    chain_id: import.meta.env.VITE_GNO_CHAIN_ID || 'dev.ibc',
    baseToken: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct.grct',
    quoteToken: WRAPPED_GRCT_SEPOLIA,
    baseDecimals: 6,
    quoteDecimals: 6,
    kind: 'escrow',
    source_channel: '1',
    dest_channel: '44',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'ethereum',
    dest: 'gnoland',
    denom: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct',
    chain_id: '11155111',
    baseToken: WRAPPED_GRCT_SEPOLIA,
    quoteToken: 'gno.land/r/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/grct.grct',
    baseDecimals: 6,
    quoteDecimals: 6,
    kind: 'unescrow',
    source_channel: '44',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  // ERCT: base ERC20 on Ethereum, wrapped voucher on gno (reverse of the
  // GRCT pair above) - eth->gno leg is 'escrow' (lock ERCT, mint voucher),
  // gno->eth leg is 'unescrow' (burn voucher, release ERCT).
  {
    src: 'ethereum',
    dest: 'gnoland',
    denom: WRAPPED_ERCT_GNO,
    chain_id: '11155111',
    baseToken: ERCT_SEPOLIA,
    quoteToken: WRAPPED_ERCT_GNO,
    baseDecimals: 18,
    quoteDecimals: 6,
    kind: 'escrow',
    source_channel: '44',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'gnoland',
    dest: 'ethereum',
    denom: WRAPPED_ERCT_GNO,
    chain_id: import.meta.env.VITE_GNO_CHAIN_ID || 'dev.ibc',
    baseToken: WRAPPED_ERCT_GNO,
    quoteToken: ERCT_SEPOLIA,
    baseDecimals: 6,
    quoteDecimals: 18,
    kind: 'unescrow',
    source_channel: '1',
    dest_channel: '44',
    metadata: '0x',
    via: 'gno-direct',
  },
  // USDT: base ERC20 already on Ethereum (existing Sepolia USDT), wrapped
  // voucher on gno (same shape as the ERCT pair above) - eth->gno leg is
  // 'escrow' (lock USDT, mint voucher), gno->eth leg is 'unescrow' (burn
  // voucher, release USDT).
  {
    src: 'ethereum',
    dest: 'gnoland',
    denom: WRAPPED_USDT_GNO,
    chain_id: '11155111',
    baseToken: USDT_SEPOLIA,
    quoteToken: WRAPPED_USDT_GNO,
    baseDecimals: 6,
    quoteDecimals: 6,
    kind: 'escrow',
    source_channel: '44',
    dest_channel: '1',
    metadata: '0x',
    via: 'gno-direct',
  },
  {
    src: 'gnoland',
    dest: 'ethereum',
    denom: WRAPPED_USDT_GNO,
    chain_id: import.meta.env.VITE_GNO_CHAIN_ID || 'dev.ibc',
    baseToken: WRAPPED_USDT_GNO,
    quoteToken: USDT_SEPOLIA,
    baseDecimals: 6,
    quoteDecimals: 6,
    kind: 'unescrow',
    source_channel: '1',
    dest_channel: '44',
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
    baseDecimals: 6,
    quoteDecimals: 6,
    kind: 'escrow',
    source_channel: '0',
    dest_channel: '0',
    metadata: '0x',
  },
]

export default routes
