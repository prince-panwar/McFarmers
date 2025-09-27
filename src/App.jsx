import React, { useState } from "react"
import { Routes, Route, Link, Navigate } from "react-router-dom"
import Hero from "./components/Hero.jsx"
import MemeBox from "./components/MemeBox.jsx"
import Clicker from "./components/Clicker.jsx"
import StatsRef from "./components/StatsRef.jsx"
import Pools from "./components/Pools.jsx"
import Socials from "./components/Socials.jsx"
import StakeModal from "./components/StakeModal.jsx"
import UnstakeModal from "./components/UnstakeModal.jsx"
import McStakeInitializer from "./components/McStakeInitializer.jsx"

function DappHome() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [showStakeModal, setShowStakeModal] = useState(false)
  const [showUnstakeModal, setShowUnstakeModal] = useState(false)
  const [selectedPoolType, setSelectedPoolType] = useState("flexible")

  const handleWalletUpdate = ({ connected, address }) => {
    setWalletConnected(connected)
    setWalletAddress(address || "")
  }

  const handleOpenStakeModal = (poolType = "flexible") => {
    setSelectedPoolType(poolType)
    setShowStakeModal(true)
  }
  const handleOpenUnstakeModal = (poolType = "flexible") => {
    setSelectedPoolType(poolType)
    setShowUnstakeModal(true)
  }
  const handleCloseStakeModal = () => setShowStakeModal(false)
  const handleCloseUnstakeModal = () => setShowUnstakeModal(false)

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
              Get hired today — click, stake, and fry the way up.
            </p>
          </div>
        </div>

        <Socials />

        {/* Quick link to initializer page */}
        <Link className="btn ghost" to="/init">Init Pools</Link>

        {/* Example header wallet UI driven by StatsRef events
        {!walletConnected ? (
          <button className="btn connect-btn" onClick={() => window.dispatchEvent(new CustomEvent("mc-connect-wallet"))}>
            Connect Wallet
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="wallet-address">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
            <button className="btn disconnect-btn" onClick={() => window.dispatchEvent(new CustomEvent("mc-disconnect-wallet"))}>
              Disconnect
            </button>
          </div>
        )} */}
      </header>

      <MemeBox />
      <Hero />

      <main className="grid">
        <Clicker />
        <StatsRef onWalletChange={handleWalletUpdate} />
      </main>

      <Pools
        onStake={handleOpenStakeModal}
        onUnstake={handleOpenUnstakeModal}
        walletConnected={walletConnected}
      />

      <footer className="foot">
        © {new Date().getFullYear()} McFarmerz — built for Solana degen season.
      </footer>

      <StakeModal
        open={showStakeModal}
        onClose={handleCloseStakeModal}
        walletConnected={walletConnected}
      />
      <UnstakeModal
        open={showUnstakeModal}
        onClose={handleCloseUnstakeModal}
        walletConnected={walletConnected}
        poolType={selectedPoolType}
      />
    </div>
  )
}

export default function App() {
  return (
    <>
      {/* Optional top-level nav for switching pages */}
      {/* <nav style={{ padding: 10 }}>
        <Link to="/" style={{ marginRight: 10 }}>Home</Link>
        <Link to="/init">Initializer</Link>
      </nav> */}

      <Routes>
        <Route path="/" element={<DappHome />} />
        <Route path="/init" element={<McStakeInitializer />} />
        {/* Redirect unknown paths to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
