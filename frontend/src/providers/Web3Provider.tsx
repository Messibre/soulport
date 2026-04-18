import { PropsWithChildren, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { Toaster } from "react-hot-toast";

import { chains, wagmiConfig } from "../web3/config";

export function Web3Provider({ children }: PropsWithChildren) {
  const queryClient = useMemo(() => new QueryClient(), []);

  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          chains={chains}
          theme={
            isDark
              ? darkTheme({
                  accentColor: "#1cb5e0",
                  borderRadius: "large",
                })
              : lightTheme({
                  accentColor: "#2c7be5",
                  borderRadius: "large",
                })
          }
          modalSize="compact"
        >
          {children}
          <Toaster position="top-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
