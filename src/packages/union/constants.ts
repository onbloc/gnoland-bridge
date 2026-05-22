import { Ucs05 } from '@unionlabs/sdk'
import { UniversalChainId } from '@unionlabs/sdk/schema/chain'
import { ChannelId } from '@unionlabs/sdk/schema/channel'

export const OSMOSIS_CHAIN_ID = UniversalChainId.make('osmosis.osmosis-1')
export const ETHEREUM_CHAIN_ID = UniversalChainId.make('ethereum.1')
export const BASE_CHAIN_ID = UniversalChainId.make('base.8453') // TODO: Update when available
// Placeholder. Gno.land bridge route is a follow-up task.
export const OSMOSIS_TO_GNOLAND_CHANNEL = 'channel-0'

export const UCS03_ETH_EVM = Ucs05.EvmDisplay.make({
  address: '0x5fbe74a283f7954f10aa04c2edf55578811aeb03',
})
export const UCS03_BASE_EVM = Ucs05.EvmDisplay.make({
  address: '0x5fbe74a283f7954f10aa04c2edf55578811aeb03',
}) // TODO: Update when available

export const ETH_SOURCE_CHANNEL_ID = ChannelId.make(6)
export const BASE_SOURCE_CHANNEL_ID = ChannelId.make(4) // TODO: Update when available

export const ETHOSMO_SOURCE_CHANNEL_ID = ChannelId.make(2)
export const BASEOSMO_SOURCE_CHANNEL_ID = ChannelId.make(3)

export const ETH_BYTECODE_BASE_CHECKSUM =
  '0xec827349ed4c1fec5a9c3462ff7c979d4c40e7aa43b16ed34469d04ff835f2a1' as const
export const BASE_BYTECODE_BASE_CHECKSUM =
  '0xec827349ed4c1fec5a9c3462ff7c979d4c40e7aa43b16ed34469d04ff835f2a1' as const // TODO: Update when available

export const cosmosUcs = (rcpt: string) =>
  Ucs05.CosmosDisplay.make({ address: rcpt as `${string}1${string}` })

export const etherUcs = (sender: string) =>
  Ucs05.EvmDisplay.make({ address: sender as `0x${string}` })

export const ETH_MODULE_HASH =
  '0x120970d812836f19888625587a4606a5ad23cef31c8684e601771552548fc6b9' as const
export const BASE_MODULE_HASH =
  '0x120970d812836f19888625587a4606a5ad23cef31c8684e601771552548fc6b9' as const // TODO: Update when available

export const ETH_ZKGM_ADDRESS =
  'osmo1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292qs2uecc'
export const BASE_ZKGM_ADDRESS =
  'osmo1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292qs2uecc'

export const UCS03_ETH_ZKGM = cosmosUcs(ETH_ZKGM_ADDRESS)
export const UCS03_BASE_ZKGM = cosmosUcs(BASE_ZKGM_ADDRESS)

export const CANONICAL_ETH_ZKGM = Ucs05.anyDisplayToCanonical(UCS03_ETH_ZKGM)
export const CANONICAL_BASE_ZKGM = Ucs05.anyDisplayToCanonical(UCS03_BASE_ZKGM)
