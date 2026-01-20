// Network Configuration
import type { NetworkConfig } from '../types';

// BSC Mainnet Configuration
export const NETWORK_CONFIG: NetworkConfig = {
  chainId: 56,
  name: 'BSC Mainnet',
  rpcUrl: 'https://bsc-dataseed1.binance.org/',
  explorerUrl: 'https://bscscan.com',
  proxyFactoryAddress: '0xB99159aBF0bF59a512970586F38292f8b9029924' as `0x${string}`,
  usdtAddress: '0x55d398326f99059fF775485246999027B3197955' as `0x${string}`,
  ctfTokenAddress: '0x364d05055614B506e2b9A287E4ac34167204cA83' as `0x${string}`,
  ctfExchangeAddress: '0xF99F5367ce708c66F0860B77B4331301A5597c86' as `0x${string}`,
  entryService: 'https://api.probable.markets',
  collateralTokenDecimals: 18,
};
