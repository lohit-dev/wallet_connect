/* eslint-disable @typescript-eslint/no-explicit-any */
import { AccountType, createAppKit, useDisconnect } from "@reown/appkit/react";
import {
  useBalance,
  useSignMessage,
  useSignTypedData,
  WagmiProvider,
} from "wagmi";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { projectId, metadata, networks, wagmiAdapter } from "./config";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { type Address } from "viem";

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          enable: () => void;
          disable: () => void;
        };
        sendData: (data: string) => void;
        initData: string;
        initDataUnsafe: {
          query_id: string;
          user: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date: string;
          hash: string;
        };
        isExpanded: boolean;
        expand: () => void;
        platform: string;
      };
    };
  }
}

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
  const [walletData, setWalletData] = useState<{
    address: string;
    caipAddress: string;
    signedMessage: string;
    balance: string;
    accounts: AccountType[] | any;
    connectionStatus: boolean;
  }>({
    address: "",
    caipAddress: "",
    signedMessage: "",
    balance: "",
    accounts: [],
    connectionStatus: false,
  });

  const [isMessageSigned, setIsMessageSigned] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isWebAppReady, setIsWebAppReady] = useState(false);

  const { address, caipAddress, isConnected, allAccounts } = useAppKitAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address as Address,
  });

  // Initialize Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      console.log("Initializing Telegram WebApp");
      try {
        tg.ready(); // Notify Telegram that the WebApp is ready
        tg.expand(); // Expand the WebApp to full screen
        setIsWebAppReady(true);
        console.log("Telegram WebApp initialized successfully");
      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
      }
    } else {
      console.error("Telegram WebApp not available");
    }
  }, []);

  // Handle wallet connection state
  useEffect(() => {
    if (isConnected && address) {
      setWalletData((prev) => ({
        ...prev,
        address: address || "",
        caipAddress: caipAddress || "",
        connectionStatus: isConnected,
      }));
      refetchBalance();
    } else {
      // Reset the state when disconnected
      setIsMessageSigned(false);
    }
  }, [isConnected, address, caipAddress, refetchBalance]);

  // Update balance in walletData
  useEffect(() => {
    if (balanceData) {
      setWalletData((prev) => ({
        ...prev,
        balance: `${balanceData.value.toString()} ${balanceData.symbol}`,
      }));
    }
  }, [balanceData]);

  // Handle MainButton click for Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !isWebAppReady) return;

    if (isConnected && address) {
      // Configure the MainButton
      tg.MainButton.text = "CONFIRM WALLET";
      tg.MainButton.show();
      tg.MainButton.enable();

      // Handle MainButton click
      const handleMainButtonClick = async () => {
        setIsSending(true);
        try {
          const signature = await signTypedDataAsync({
            domain: {
              chainId: BigInt(1),
              name: "Garden",
              version: "1",
            },
            message: {
              content: "Hello Garden",
            },
            primaryType: "Message",
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
              ],
              Message: [{ name: "content", type: "string" }],
            },
            account: address as any,
          });

          setWalletData((prev) => ({
            ...prev,
            signedMessage: signature,
            accounts: allAccounts,
          }));

          // Prepare data to send back to Telegram
          const data = JSON.stringify({
            accounts: allAccounts,
            address,
            caipAddress,
            signedMessage: signature,
            balance: balanceData
              ? `${balanceData.formatted} ${balanceData.symbol}`
              : "",
          });

          console.log("The data sent is:", data);

          // Send data to Telegram
          tg.sendData(data);

          // Close the WebApp after sending data
          setTimeout(() => {
            tg.close();
          }, 2000);
        } catch (error) {
          console.error("Error signing message or sending data:", error);
        } finally {
          setIsSending(false);
        }
      };

      tg.MainButton.onClick(handleMainButtonClick);

      // Cleanup MainButton click handler
      return () => {
        tg.MainButton.offClick(handleMainButtonClick);
      };
    } else {
      // Hide the MainButton if wallet is not connected
      tg.MainButton.hide();
    }
  }, [
    isConnected,
    address,
    isWebAppReady,
    signMessageAsync,
    walletData.balance,
    caipAddress,
    balanceData,
    allAccounts,
  ]);

  const handleConnect = () => {
    open({ view: "Connect" });
  };

  const handleSwitchNetwork = () => {
    open({ view: "Networks" });
  };

  const handleDisconnect = () => {
    disconnect();
    setIsMessageSigned(false);
  };

  // This is custom sign implementation
  // const handleSignMessage = async () => {
  //   if (!address) return;
  //   try {
  //     const message = "Hello Reown AppKit!";
  //     const signature = await signMessageAsync({
  //       message,
  //       account: address as Address,
  //     });
  //     setWalletData((prev) => ({
  //       ...prev,
  //       signedMessage: signature,
  //     }));

  //   // Set the message as signed
  //     setIsMessageSigned(true);
  //   } catch (error) {
  //     console.error("Signing failed:", error);
  //   }
  // };

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
            <button onClick={handleSwitchNetwork}>Change Network</button>
            <button onClick={handleDisconnect} className="disconnect-button">
              Disconnect
            </button>
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

            {isConnected && !isMessageSigned && walletData.address && (
              <div className="signature-notice">
                <p>Please sign the message to continue</p>
              </div>
            )}

            {isSending && (
              <div className="sending-notice">
                <p>Sending data and closing Telegram WebApp...</p>
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
