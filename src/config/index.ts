import { parseAbi } from 'viem'

import type { TickSize, RoundConfig } from "../types"

export const ENV_CONDITIONAL_TOKEN_DECIMALS = 18
export const ENV_PROTOCOL_VERSION = '1'

// Network Configuration
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  proxyFactoryAddress: `0x${string}`;
  usdtAddress: `0x${string}`;
  ctfTokenAddress: `0x${string}`;
  ctfExchangeAddress: `0x${string}`;
  entryService: string;
  collateralTokenDecimals: number;
}

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

// Export network-specific values for backward compatibility
export const CHAIN_ID = NETWORK_CONFIG.chainId;
export const PROXY_FACTORY_ADDRESS = NETWORK_CONFIG.proxyFactoryAddress;
export const USDT_ADDRESS = NETWORK_CONFIG.usdtAddress;
export const CTF_TOKEN_ADDRESS = NETWORK_CONFIG.ctfTokenAddress;
export const CTF_EXCHANGE_ADDRESS = NETWORK_CONFIG.ctfExchangeAddress;
export const ENTRY_SERVICE = NETWORK_CONFIG.entryService;
export const ENV_COLLATERAL_TOKEN_DECIMALS = NETWORK_CONFIG.collateralTokenDecimals;

export const ROUNDING_CONFIG: Record<TickSize, RoundConfig> = {
  '0.1': {
    price: 1,
    size: 2,
    amount: 3,
  },
  '0.01': {
    price: 2,
    size: 2,
    amount: 4,
  },
  '0.001': {
    price: 3,
    size: 2,
    amount: 5,
  },
  '0.0001': {
    price: 4,
    size: 2,
    amount: 6,
  },
}

// EIP712 Objects
export const EIP712_DOMAIN = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

export const MSG_TO_SIGN = "This message attests that I control the given wallet"

export const ORDER_STRUCTURE = [
  { name: 'salt', type: 'uint256' },
  { name: 'maker', type: 'address' },
  { name: 'signer', type: 'address' },
  { name: 'taker', type: 'address' },
  { name: 'tokenId', type: 'uint256' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
  { name: 'expiration', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'feeRateBps', type: 'uint256' },
  { name: 'side', type: 'uint8' },
  { name: 'signatureType', type: 'uint8' },
]

// ERC20 ABI - only functions we use
export const ERC20_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

// ERC1155 ABI - only functions we use
export const ERC1155_ABI = parseAbi([
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
]);


// Proxy Factory ABI - only functions we use
export const PROXY_FACTORY_ABI = parseAbi([
  'function computeProxyAddress(address user) view returns (address)',
  'function createProxy(address paymentToken, uint256 payment, address payable paymentReceiver, (uint8 v, bytes32 r, bytes32 s) createSig)',
]);
