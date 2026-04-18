import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

const baseSepoliaRpc = process.env.REACT_APP_BASE_SEPOLIA_RPC_URL;

export const chains = [baseSepolia, base] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    coinbaseWallet({
      appName: "SoulPort",
      appLogoUrl: "https://soulport.xyz/logo.png",
      preference: "smartWalletOnly",
    } as Parameters<typeof coinbaseWallet>[0]),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(baseSepoliaRpc || undefined),
  },
});
