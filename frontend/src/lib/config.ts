import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
  },
});

export const config = {
  privy: {
    appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  },
  chains: [baseSepolia],
};
