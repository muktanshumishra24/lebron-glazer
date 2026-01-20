/** @type {import('next').NextConfig} */
const webpack = require('webpack')

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  // Webpack configuration for handling Node.js modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle Node.js modules on server side
      config.externals = [...(config.externals || []), 'fs', 'path'];
    }
    
    // Ignore optional peer dependencies from @wagmi/connectors
    // These are optional dependencies that aren't needed for the metaMask connector
    // We only use the 'metaMask' connector, so we can safely ignore all other connector dependencies
    // NOTE: 'wagmi/connectors' and '@metamask/sdk' are NOT optional - we need them for the metaMask connector!
    const optionalDependencies = [
      '@base-org/account',
      'porto',
      'porto/internal',
      '@coinbase/wallet-sdk',
      '@gemini-wallet/core',
      '@walletconnect/ethereum-provider',
      '@walletconnect/modal',
      '@walletconnect/types',
      '@safe-global/safe-apps-provider',
      '@safe-global/safe-apps-sdk',
      '@react-native-async-storage/async-storage', // React Native dependency, not needed for web
    ];
    
    // Use IgnorePlugin to prevent module resolution
    // This prevents webpack from trying to bundle these optional dependencies
    optionalDependencies.forEach((dep) => {
      // Escape special regex characters in the dependency name
      const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: new RegExp(`^${escapedDep}$`),
        })
      );
    });
    
    // Also add to fallback for client-side (prevents resolution errors)
    const fallback = {
      ...config.resolve.fallback,
    };
    optionalDependencies.forEach((dep) => {
      fallback[dep] = false;
    });
    config.resolve.fallback = fallback;
    
    return config;
  },
}

module.exports = nextConfig
