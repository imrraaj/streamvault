"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig, config } from "@/lib/config";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={config.privy.appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: config.chains[0],
        supportedChains: config.chains,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
