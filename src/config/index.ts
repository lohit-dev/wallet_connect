import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  arbitrum,
  sepolia,
  bitcoin,
  solana,
  solanaTestnet,
  solanaDevnet,
  kakarotStarknetSepolia,
  arbitrumSepolia,
} from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Get projectId from https://cloud.reown.com
export const projectId = "0e504323519d920498cb09268e59a1db"; // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error("Project ID is not defined");
}

export const metadata = {
  name: "AppKit",
  description: "AppKit Example",
  url: "https://reown.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// for custom networks visit -> https://docs.reown.com/appkit/react/core/custom-networks
export const networks = [
  mainnet,
  arbitrum,
  sepolia,
  bitcoin,
  solana,
  solanaTestnet,
  solanaDevnet,
  kakarotStarknetSepolia,
  arbitrumSepolia,
] as [AppKitNetwork, ...AppKitNetwork[]];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
