import { createConfig, http } from 'wagmi'
import { bsc } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'
import { NETWORK_CONFIG } from './index'

export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "The King's Court",
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
    }),
  ],
  transports: {
    [bsc.id]: http(NETWORK_CONFIG.rpcUrl),
  },
})
