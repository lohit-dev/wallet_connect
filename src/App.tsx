import { createAppKit, useDisconnect } from "@reown/appkit/react";
import { useBalance, useSignMessage, WagmiProvider } from "wagmi";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { projectId, metadata, networks, wagmiAdapter } from "./config";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { type Address } from "viem";
import { WebApp } from "@grammyjs/web-app";

// Create query client
const queryClient = new QueryClient();

// AppKit configuration
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#2481cc", // Telegram blue
    // "--w3m-background-color": "#ffffff",
    // "--w3m-text-color": "#000000",
  },
  features: {
    email: false,
    analytics: true,
    legalCheckbox: true,
    connectMethodsOrder: ["wallet"],
  },
});

// Simple component for wallet actions
function WalletActions() {
  const [walletData, setWalletData] = useState({
    address: "",
    caipAddress: "",
    signedMessage: "",
    balance: "",
    connectionStatus: false,
  });

  const { address, caipAddress, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address as Address,
    // enabled: !!address,
  });

  useEffect(() => {
    if (isConnected && address) {
      setWalletData((prev) => ({
        ...prev,
        address: address || "",
        caipAddress: caipAddress || "",
        connectionStatus: isConnected,
      }));
      refetchBalance();
    }
  }, [isConnected, address, caipAddress, refetchBalance]);

  useEffect(() => {
    if (balanceData) {
      setWalletData((prev) => ({
        ...prev,
        balance: `${balanceData.value.toString()} ${balanceData.symbol}`,
      }));
    }
  }, [balanceData]);

  const handleConnect = () => {
    open({ view: "Connect" });
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSignMessage = async () => {
    if (!address) return;
    try {
      const message = "Hello Reown AppKit!";
      const signature = await signMessageAsync({
        message,
        account: address as Address,
      });
      setWalletData((prev) => ({
        ...prev,
        signedMessage: signature,
      }));

      WebApp.sendData(JSON.stringify(walletData));
    } catch (error) {
      console.error("Signing failed:", error);
    }
  };

  const truncateAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="wallet-container">
      <div className="buttons">
        {!isConnected ? (
          <button onClick={handleConnect}>Connect Wallet</button>
        ) : (
          <>
            <button onClick={handleConnect}>Open Wallet</button>
            <button onClick={handleSignMessage}>Sign Message</button>
            <button onClick={handleDisconnect} className="disconnect-button">
              Disconnect
            </button>
            {/* <button onClick={refetchBalance}>Refresh Balance</button> */}
          </>
        )}
      </div>

      {isConnected && (
        <div className="data-display">
          <h2>Wallet Data</h2>
          <div className="wallet-data">
            <div className="wallet-data-item">
              <span className="wallet-data-label">Status</span>
              <span className="wallet-data-value">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="wallet-data-item">
              <span className="wallet-data-label">Address</span>
              <span className="wallet-data-value">
                {truncateAddress(address)}
              </span>
            </div>
            {balanceData && (
              <div className="wallet-data-item">
                <span className="wallet-data-label">Balance</span>
                <span className="wallet-data-value">
                  {balanceData.formatted} {balanceData.symbol}
                </span>
              </div>
            )}
            {walletData.signedMessage && (
              <div className="wallet-data-item">
                <span className="wallet-data-label">Signed Message</span>
                <span className="wallet-data-value">{`${walletData.signedMessage.slice(
                  0,
                  20
                )}...`}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main App component
export function App() {
  return (
    <div className="app-container">
      <h1>Web3 Wallet Connect</h1>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WalletActions />
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}

export default App;
