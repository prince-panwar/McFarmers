import React, { useState, useEffect } from "react";
import Hero from "./components/Hero.jsx";
import MemeBox from "./components/MemeBox.jsx";
import Clicker from "./components/Clicker.jsx";
import StatsRef from "./components/StatsRef.jsx";
import Pools from "./components/Pools.jsx";
import Socials from "./components/Socials.jsx";
import StakeModal from "./components/StakeModal.jsx";

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check wallet connection on mount
    if (window.solana && window.solana.isConnected) {
      setWalletConnected(true);
      setWalletAddress(window.solana.publicKey.toString());
    }
    // Listen for wallet connect/disconnect
    if (window.solana) {
      window.solana.on("connect", (publicKey) => {
        setWalletConnected(true);
        setWalletAddress(publicKey.toString());
      });
      window.solana.on("disconnect", () => {
        setWalletConnected(false);
        setWalletAddress("");
      });
    }
    return () => {
      if (window.solana) {
        window.solana.removeAllListeners("connect");
        window.solana.removeAllListeners("disconnect");
      }
    };
  }, []);

  const handleConnectWallet = async () => {
    if (window.solana) {
      try {
        const response = await window.solana.connect();
        setWalletConnected(true);
        setWalletAddress(response.publicKey.toString());
      } catch (e) {
        alert("Failed to connect wallet.", e);
      }
    } else {
      alert("No Solana wallet found. Please install Phantom.");
    }
  };

  const handleDisconnectWallet = async () => {
    if (window.solana) {
      await window.solana.disconnect();
      setWalletConnected(false);
      setWalletAddress("");
    }
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <img className="logo-img" src="/assets/coin-mc.png" alt="MC" />
          <div>
            <h1>
              McFarmerz <span className="badge">degen APY farm</span>
            </h1>
            <p className="subtitle">
              Get hired today — click, stake, and fry your way up.
            </p>
          </div>
        </div>
        <Socials />
        {!walletConnected ? (
          <button className="btn connect-btn" onClick={handleConnectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="wallet-address">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
            <button className="btn disconnect-btn" onClick={handleDisconnectWallet}>
              Disconnect
            </button>
          </div>
        )}
      </header>

      <MemeBox />
      <Hero />

      <main className="grid">
        <Clicker />
        <StatsRef />
      </main>

      {/* Pass the handleOpenModal function to Pools */}
      <Pools onStake={handleOpenModal} walletConnected={walletConnected} />

      <footer className="foot">
        © {new Date().getFullYear()} McFarmerz — built for Solana degen season.
      </footer>

      {/* Ensure the modal opens when showModal is true */}
      <StakeModal open={showModal} onClose={handleCloseModal} walletConnected={walletConnected} />
    </div>
  );
}