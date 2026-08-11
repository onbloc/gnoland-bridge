export type GnoNetwork = {
  id: string
  default: boolean
  main: boolean
  chainId: string
  chainName: string
  networkId: string
  networkName: string
  addressPrefix: string
  rpcUrl: string
  indexerUrl: string
  gnoUrl: string
  apiUrl: string
  linkUrl: string
}

export const GNO_NETWORKS = {
  gnoland1: {
    id: 'gnoland1',
    default: true,
    main: true,
    chainId: 'gnoland1',
    chainName: 'Gno.land',
    networkId: 'gnoland1',
    networkName: 'Beta Mainnet',
    addressPrefix: 'g',
    rpcUrl: 'https://rpc.betanet.testnets.gno.land:443',
    indexerUrl: 'https://gnoland1.indexer.onbloc.xyz',
    gnoUrl: 'https://betanet.testnets.gno.land',
    apiUrl: 'https://gnoland1.api.onbloc.xyz',
    linkUrl: 'https://gnoscan.io',
  },
  sapphire: {
    id: 'sapphire',
    default: true,
    main: false,
    chainId: 'sapphire-1',
    chainName: 'sapphire',
    networkId: 'sapphire',
    networkName: 'Sapphire',
    addressPrefix: 'g',
    rpcUrl: 'https://sapphire.rpc.onbloc.xyz:443',
    indexerUrl: 'https://sapphire.indexer.onbloc.xyz:443',
    gnoUrl: 'https://sapphire.testnets.gno.land/',
    apiUrl: '',
    linkUrl: 'https://gnoscan.io',
  },
} satisfies Record<string, GnoNetwork>

export type GnoNetworkId = keyof typeof GNO_NETWORKS
export type BridgeNetworkMode = GnoNetworkId

export type BridgeNetworkOption = {
  id: BridgeNetworkMode
  label: string
  gnoNetworkId: GnoNetworkId
  evmChainId: number
  supported: boolean
  helperText: string
}

export const DEFAULT_GNO_NETWORK = GNO_NETWORKS.sapphire

export const BRIDGE_NETWORK_OPTIONS: BridgeNetworkOption[] = [
  {
    id: 'sapphire',
    label: 'Sapphire',
    gnoNetworkId: 'sapphire',
    evmChainId: 11155111,
    supported: true,
    helperText: 'sapphire',
  },
  {
    id: 'gnoland1',
    label: 'Gno.land',
    gnoNetworkId: 'gnoland1',
    evmChainId: 1,
    supported: false,
    helperText: 'To be supported',
  },
]

export const DEFAULT_BRIDGE_NETWORK_MODE: BridgeNetworkMode = 'sapphire'

export const resolveBridgeNetworkOption = (
  mode?: BridgeNetworkMode
): BridgeNetworkOption =>
  BRIDGE_NETWORK_OPTIONS.find((option) => option.id === mode) ||
  BRIDGE_NETWORK_OPTIONS[0]

export const getBridgeGnoNetwork = (mode?: BridgeNetworkMode): GnoNetwork =>
  GNO_NETWORKS[resolveBridgeNetworkOption(mode).gnoNetworkId]

export const resolveGnoNetwork = (chainId?: string): GnoNetwork | undefined =>
  chainId
    ? Object.values(GNO_NETWORKS).find((network) => network.chainId === chainId)
    : undefined
