import { Connector, WagmiConfig, createConfig } from "wagmi";
import { optimismGoerli, polygonMumbai, goerli } from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig, ConnectKitButton } from "connectkit";

const chains = [ optimismGoerli, polygonMumbai, goerli ];

const config = createConfig(
  getDefaultConfig({
    appName: "Ghost NFT Protocol",
    alchemyId: process.env.ALCHEMY_API_KEY,
    walletConnectProjectId: (process.env.WALLETCONNECT_PROJECT_ID as string),
    chains
  })
);

export function EthereumProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <ConnectKitProvider theme="rounded">
        {children}
      </ConnectKitProvider>
    </WagmiConfig>
  );
};
