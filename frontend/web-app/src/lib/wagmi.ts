/**
 * Wagmi 配置 - Web3 钱包连接
 * 仅使用 injected connector 避免 SSR 问题
 */

import { http, createConfig, type Config } from 'wagmi'
import { mainnet, arbitrum, optimism, base, polygon } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// 基础配置，仅使用 injected (MetaMask 等浏览器钱包)
// 避免 WalletConnect 的 SSR 兼容性问题
export const config: Config = createConfig({
  chains: [mainnet, arbitrum, optimism, base, polygon],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
  },
  ssr: true, // 启用 SSR 支持
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
