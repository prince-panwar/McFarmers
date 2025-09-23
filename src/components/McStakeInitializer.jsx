import React, { useState, useEffect } from "react"
import { PublicKey, Transaction } from "@solana/web3.js"
import { BN } from "@coral-xyz/anchor"
import "./initializer.css"
import { program, connection } from "../anchor/setup"
import { Buffer } from "buffer"

const McStakeInitializer = () => {
  const [publicKey, setPublicKey] = useState(null)
  const [connected, setConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPool, setSelectedPool] = useState("flexible")
  const [formData, setFormData] = useState({
    apy: "",
    minStake: "",
    mintAddress: "", // Added mint address field
    poolType: "flexible",
  })
  const [status, setStatus] = useState("")

  // Check if wallet is already connected on component mount
  useEffect(() => {
    checkWalletConnection()
    // Listen for wallet connection changes
    if (window.solana) {
      window.solana.on("connect", (publicKey) => {
        console.log("Wallet connected:", publicKey.toString())
        setPublicKey(publicKey)
        setWalletAddress(publicKey.toString())
        setConnected(true)
      })
      window.solana.on("disconnect", () => {
        console.log("Wallet disconnected")
        setPublicKey(null)
        setWalletAddress("")
        setConnected(false)
      })
    }
    return () => {
      // Cleanup listeners
      if (window.solana) {
        window.solana.removeAllListeners("connect")
        window.solana.removeAllListeners("disconnect")
      }
    }
  }, [])

  const checkWalletConnection = async () => {
    try {
      if (window.solana && window.solana.isConnected) {
        const publicKey = window.solana.publicKey
        setPublicKey(publicKey)
        setWalletAddress(publicKey.toString())
        setConnected(true)
      }
    } catch (error) {
      console.log("Error checking wallet connection:", error)
    }
  }

  // Pool type configurations
  const poolConfigs = {
    flexible: {
      name: "McFlex Pool",
      description: "Instant withdrawals, lower APY",
      icon: "",
      color: "#FFD700",
      defaultApy: "1000", // 10%
      lockPeriod: "0 days",
    },
    locked: {
      name: "McLock Pool",
      description: "7-day lock, higher APY",
      icon: "🍔",
      color: "#FF6B35",
      defaultApy: "1500", // 15%
      lockPeriod: "7 days",
    },
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePoolSelect = (poolType) => {
    setSelectedPool(poolType)
    setFormData((prev) => ({
      ...prev,
      poolType: poolType,
      apy: poolConfigs[poolType].defaultApy,
    }))
  }

  // Validate mint address
  const isValidMintAddress = (address) => {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  const connectWallet = async () => {
    try {
      if (window.solana) {
        setIsLoading(true)
        setStatus("🔗 Connecting to wallet...")
        const response = await window.solana.connect()
        const pk = response.publicKey.toString()
        setPublicKey(response.publicKey)
        setWalletAddress(pk)
        setConnected(true)
        setStatus("Wallet connected successfully!")
        setTimeout(() => setStatus(""), 3000)
      } else {
        alert(
          "No Solana wallet found. Please install a Solana wallet extension like Phantom."
        )
      }
    } catch (error) {
      console.error("Wallet connection error:", error)
      setStatus(" Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = async () => {
    try {
      if (window.solana) {
        await window.solana.disconnect()
        setPublicKey(null)
        setWalletAddress("")
        setConnected(false)
        setStatus("Wallet disconnected")
        setTimeout(() => setStatus(""), 3000)
      }
    } catch (error) {
      console.error("Wallet disconnect error:", error)
    }
  }

  const initializePool = async () => {
    if (!connected || !publicKey) {
      setStatus(" Please connect your wallet first!")
      return
    }

    if (!formData.apy || !formData.minStake || !formData.mintAddress) {
      setStatus(" Please fill all fields!")
      return
    }

    // Validate mint address
    if (!isValidMintAddress(formData.mintAddress)) {
      setStatus(" Invalid mint address format!")
      return
    }

    setIsLoading(true)
    setStatus(" Preparing your McStake pool...")

    try {
      // Derive pool PDA
      const poolTypeSeed = selectedPool === "flexible" ? "flexible" : "locked"
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolTypeSeed)],
        program.programId
      )

      // Use the mint address from form input
      const mint = new PublicKey(formData.mintAddress)

      const {
        getAssociatedTokenAddress,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
      } = await import("@solana/spl-token")

      const tokenVault = await getAssociatedTokenAddress(
        mint,
        poolPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      setStatus("Building transaction...")

      // Initialize pool
      const poolTypeEnum =
        selectedPool === "flexible" ? { flexible: {} } : { locked: {} }

      // Create the transaction instruction
      const instruction = await program.methods
        .initPool(
          new BN(parseInt(formData.apy)),
          poolTypeEnum,
          new BN(parseInt(formData.minStake))
        )
        .accounts({
          admin: publicKey,
          pool: poolPda,
          mint: mint,
          tokenVault: tokenVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: new PublicKey("11111111111111111111111111111111"),
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .instruction()

      // Create transaction
      const transaction = new Transaction().add(instruction)
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      setStatus("🔐 Please sign the transaction in your wallet...")

      // Sign transaction with wallet
      const signedTransaction = await window.solana.signTransaction(transaction)
      setStatus("📡 Broadcasting transaction...")

      // Send transaction
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      )

      setStatus("⏳ Confirming transaction...")

      // Confirm transaction
      await connection.confirmTransaction(signature, "confirmed")

      setStatus(`🎉 McStake pool initialized! Tx: ${signature.slice(0, 8)}...`)

      // Reset form
      setFormData({
        apy: poolConfigs[selectedPool].defaultApy,
        minStake: "",
        mintAddress: "",
        poolType: selectedPool,
      })

      // Clear status after 5 seconds
      setTimeout(() => setStatus(""), 5000)
    } catch (error) {
      console.error("Pool initialization error:", error)
      if (error.message.includes("User rejected")) {
        setStatus(` Transaction cancelled by user`)
      } else if (error.message.includes("insufficient funds")) {
        setStatus(` Insufficient SOL for transaction fees`)
      } else if (error.message.includes("invalid mint")) {
        setStatus(` Invalid or non-existent token mint`)
      } else {
        setStatus(` Failed to initialize pool: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mcstake-initializer">
      {/* Header Section */}
      <div className="mcstake-header">
        <div className="mcstake-logo">
          <div className="logo-circle">McS</div>
          <div className="logo-text">
            <h1>McStake</h1>
            <p>degen APY farm</p>
          </div>
        </div>
        <div className="header-tagline">
          Initialize your staking pool — click, configure, and serve yields!
        </div>
      </div>

      {/* Main Content */}
      <div className="mcstake-content">
        {/* Pool Type Selection */}
        <div className="pool-selection">
          <h2>Choose Your McPool</h2>
          <div className="pool-cards">
            {Object.entries(poolConfigs).map(([type, config]) => (
              <div
                key={type}
                className={`pool-card ${
                  selectedPool === type ? "selected" : ""
                } ${!connected ? "disabled" : ""}`}
                onClick={() => connected && handlePoolSelect(type)}
                style={{
                  borderColor: selectedPool === type ? config.color : "#666",
                }}
              >
                <div
                  className="pool-icon"
                  style={{ backgroundColor: config.color }}
                >
                  {config.icon}
                </div>
                <div className="pool-info">
                  <h3>{config.name}</h3>
                  <p>{config.description}</p>
                  <div className="pool-stats">
                    <span>Lock: {config.lockPeriod}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="config-panel">
          <h2>Pool Configuration</h2>

          <div className="config-grid">
            <div className="config-item">
              <label>Token Mint Address</label>
              <div className="input-group">
                <input
                  type="text"
                  value={formData.mintAddress}
                  onChange={(e) =>
                    handleInputChange("mintAddress", e.target.value)
                  }
                  placeholder="Enter SPL token mint address"
                  className={`mcstake-input ${
                    formData.mintAddress &&
                    !isValidMintAddress(formData.mintAddress)
                      ? "invalid"
                      : formData.mintAddress &&
                        isValidMintAddress(formData.mintAddress)
                      ? "valid"
                      : ""
                  }`}
                  disabled={!connected}
                />
                <span className="input-suffix">
                  {formData.mintAddress
                    ? isValidMintAddress(formData.mintAddress)
                      ? ""
                      : ""
                    : "🪙"}
                </span>
              </div>
              <small>SPL token contract address for staking</small>
            </div>

            <div className="config-item">
              <label>APY (Basis Points)</label>
              <div className="input-group">
                <input
                  type="number"
                  value={formData.apy}
                  onChange={(e) => handleInputChange("apy", e.target.value)}
                  placeholder="1000 = 10%"
                  className="mcstake-input"
                  disabled={!connected}
                />
                <span className="input-suffix">bp</span>
              </div>
              <small>1000 basis points = 10% APY</small>
            </div>

            <div className="config-item">
              <label>Minimum Stake</label>
              <div className="input-group">
                <input
                  type="number"
                  value={formData.minStake}
                  onChange={(e) =>
                    handleInputChange("minStake", e.target.value)
                  }
                  placeholder="10000"
                  className="mcstake-input"
                  disabled={!connected}
                />
                <span className="input-suffix">tokens</span>
              </div>
              <small>Minimum tokens required to stake</small>
            </div>
          </div>

          {/* Pool Preview */}
          <div className="pool-preview">
            <h3>Pool Preview</h3>
            <div className="preview-stats">
              <div className="stat">
                <span className="stat-label">Type:</span>
                <span className="stat-value">
                  {poolConfigs[selectedPool].name}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Token:</span>
                <span className="stat-value">
                  {formData.mintAddress
                    ? `${formData.mintAddress.slice(
                        0,
                        4
                      )}...${formData.mintAddress.slice(-4)}`
                    : "Not set"}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">APY:</span>
                <span className="stat-value">
                  {formData.apy
                    ? (parseInt(formData.apy) / 100).toFixed(1)
                    : "0"}
                  %
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Min Stake:</span>
                <span className="stat-value">
                  {formData.minStake || "0"} tokens
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Lock Period:</span>
                <span className="stat-value">
                  {poolConfigs[selectedPool].lockPeriod}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Single Action Button - Connect or Initialize */}
        <div className="action-section">
          {!connected ? (
            <button
              className="mcstake-button primary connect-wallet-btn"
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Connecting...
                </>
              ) : (
                <>🔗 Connect Wallet to Continue</>
              )}
            </button>
          ) : (
            <button
              className="mcstake-button primary"
              onClick={initializePool}
              disabled={
                isLoading ||
                !connected ||
                !formData.apy ||
                !formData.minStake ||
                !formData.mintAddress ||
                !isValidMintAddress(formData.mintAddress)
              }
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Cooking Pool...
                </>
              ) : (
                <> Initialize McStake Pool</>
              )}
            </button>
          )}

          {/* Wallet Status Display (only when connected) */}
          {connected && publicKey && (
            <div className="wallet-status" style={{ marginTop: 10 }}>
              <button
                className="primary mcstake-button disconnect-wallet"
                onClick={disconnectWallet}
              >
                <span className="wallet-address">
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </span>
                Disconnect
              </button>
            </div>
          )}

          {status && (
            <div
              className={`status-message ${
                status.includes("")
                  ? "error"
                  : status.includes("🎉")
                  ? "success"
                  : "info"
              }`}
            >
              {status}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="info-section">
          <h3>About McStake Pools</h3>
          <div className="info-grid">
            <div className="info-card">
              <h4> Flexible Pool</h4>
              <ul>
                <li>No lock period</li>
                <li>Lower APY (typically 8-12%)</li>
                <li>Instant withdrawals</li>
                <li>2% stake fee, 10% withdraw fee</li>
              </ul>
            </div>
            <div className="info-card">
              <h4>🍔 Locked Pool</h4>
              <ul>
                <li>7-day lock period</li>
                <li>Higher APY (typically 12-20%)</li>
                <li>Delayed withdrawals</li>
                <li>2% stake fee, 10% withdraw fee</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default McStakeInitializer
