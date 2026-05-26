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
  'test-13': {
    id: 'test-13',
    default: true,
    main: false,
    chainId: 'test-13',
    chainName: 'test-13',
    networkId: 'test-13',
    networkName: 'Testnet 13',
    addressPrefix: 'g',
    rpcUrl: 'https://rpc.test-13-aeddi-1.gnoland.network:443',
    indexerUrl: 'https://indexer.test-13.gnoland.network:443',
    gnoUrl: 'https://gnoweb.test-13.gnoland.network',
    apiUrl: '',
    linkUrl: 'https://gnoscan.io',
  },
  dev: {
    id: 'dev',
    default: true,
    main: false,
    chainId: 'dev',
    chainName: 'Gno.land',
    networkId: 'dev',
    networkName: 'Local',
    addressPrefix: 'g',
    rpcUrl: 'https://rpc.bridge.onbloc.xyz/',
    indexerUrl: '',
    gnoUrl: 'http://127.0.0.1:8888',
    apiUrl: '',
    linkUrl: 'http://127.0.0.1:3000',
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

export const DEFAULT_GNO_NETWORK = GNO_NETWORKS.dev

export const BRIDGE_NETWORK_OPTIONS: BridgeNetworkOption[] = [
  {
    id: 'dev',
    label: 'Local',
    gnoNetworkId: 'dev',
    evmChainId: 11155111,
    supported: true,
    helperText: 'dev',
  },
  {
    id: 'test-13',
    label: 'Testnet 13',
    gnoNetworkId: 'test-13',
    evmChainId: 11155111,
    supported: false,
    helperText: 'To be supported',
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

export const DEFAULT_BRIDGE_NETWORK_MODE: BridgeNetworkMode = 'dev'

export const resolveBridgeNetworkOption = (
  mode?: BridgeNetworkMode
): BridgeNetworkOption =>
  BRIDGE_NETWORK_OPTIONS.find((option) => option.id === mode) ||
  BRIDGE_NETWORK_OPTIONS[0]

export const getBridgeGnoNetwork = (mode?: BridgeNetworkMode): GnoNetwork =>
  GNO_NETWORKS[resolveBridgeNetworkOption(mode).gnoNetworkId]

export const resolveGnoNetwork = (chainId?: string): GnoNetwork | undefined =>
  chainId && chainId in GNO_NETWORKS
    ? GNO_NETWORKS[chainId as GnoNetworkId]
    : undefined
