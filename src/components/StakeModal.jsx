import React, { useState, useEffect } from "react"
import { PublicKey, Transaction } from "@solana/web3.js"
import { BN } from "@coral-xyz/anchor"
import { Buffer } from "buffer"
import "../Styles.css"
import { connection, program, getAccountData } from "../anchor/setup"

export default function StakeModal({ open, onClose, walletConnected }) {
  const [selectedPool, setSelectedPool] = useState("Pool 1")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState("")
  const [error, setError] = useState("")
  const [accountData, setAccountData] = useState(null)
  const [publicKey, setPublicKey] = useState(null)

  // Get wallet public key and account data when wallet is connected
  useEffect(() => {
    const fetchData = async () => {
      if (walletConnected && window.solana) {
        try {
          // Get public key
          const pk = window.solana.publicKey
          setPublicKey(pk)

          // Fetch account data
          const data = await getAccountData()
          setAccountData(data)
          console.log("Account Data:", data)
        } catch (error) {
          console.error("Error fetching data:", error)
        }
      }
    }

    if (open && walletConnected) {
      fetchData()
    }
  }, [open, walletConnected])

  // Pool configurations
  const poolConfigs = {
    "Pool 1": {
      type: "flexible",
      name: "McFlex Pool",
      icon: "🍔",
      description: "Instant withdrawals, Lower APY",
    },
    "Pool 2": {
      type: "locked",
      name: "McLock Pool",
      icon: "🍟",
      description: "7-day lock, Higher APY",
    },
  }

  const handleStake = async () => {
    if (!walletConnected || !publicKey || !amount) {
      setError("Please connect wallet and enter amount")
      return
    }

    if (parseFloat(amount) <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    setLoading(true)
    setError("")
    setTxSig("")

    try {
      const selectedPoolConfig = poolConfigs[selectedPool]
      const poolType = selectedPoolConfig.type // "flexible" or "locked"

      // Find the matching pool from accountData based on poolType
      const matchingPool = accountData?.pools?.find((pool) => {
        const accountPoolType = pool.account.poolType
        if (poolType === "flexible") {
          return accountPoolType.flexible !== undefined
        } else if (poolType === "locked") {
          return accountPoolType.locked !== undefined
        }
        return false
      })

      if (!matchingPool) {
        setError(`${poolType} pool not found in account data`)
        return
      }

      // Extract mint address from the matching pool
      const mint = matchingPool.account.mint

      console.log("Selected Pool Type:", poolType)
      console.log("Mint Address:", mint.toString())

      // ADDED: Fetch token decimals dynamically from the mint
      const { getMint } = await import("@solana/spl-token")
      let tokenDecimals = 6 // Default fallback

      try {
        const mintInfo = await getMint(connection, mint)
        tokenDecimals = mintInfo.decimals
        console.log("Token Decimals:", tokenDecimals)
      } catch (err) {
        console.warn("Failed to fetch token decimals, using default (6):", err)
        // Continue with default decimals if fetch fails
      }

      // Derive pool PDA based on selected pool type
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolType)],
        program.programId
      )

      // Derive user stake PDA
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer(), Buffer.from(poolType)],
        program.programId
      )

      const {
        getAssociatedTokenAddress,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
      } = await import("@solana/spl-token")

      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        mint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const tokenVault = await getAssociatedTokenAddress(
        mint,
        poolPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const adminTokenAccount = await getAssociatedTokenAddress(
        mint,
        new PublicKey("GdLfQn7SkU2MCH4vH1Q7cY8q3feHwhRFGJjHXNkRK3hS"), // Your hardcoded admin key
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // UPDATED: Convert amount to token units using actual decimals
      const tokenMultiplier = Math.pow(10, tokenDecimals)
      const stakeAmount = new BN(parseFloat(amount) * tokenMultiplier)

      console.log("Stake calculation:", {
        inputAmount: amount,
        tokenDecimals,
        tokenMultiplier,
        finalStakeAmount: stakeAmount.toString(),
      })

      // Validate against minimum stake from pool data
      const minStakeRequired = matchingPool.account.minStake.toNumber()
      if (stakeAmount.toNumber() < minStakeRequired) {
        setError(
          `Minimum stake required: ${minStakeRequired / tokenMultiplier} tokens`
        )
        return
      }

      console.log("Transaction accounts:", {
        user: publicKey.toString(),
        pool: poolPda.toString(),
        userStake: userStakePda.toString(),
        mint: mint.toString(),
        userTokenAccount: userTokenAccount.toString(),
        tokenVault: tokenVault.toString(),
        adminTokenAccount: adminTokenAccount.toString(),
      })

      // Import SystemProgram from @solana/web3.js
      const { SystemProgram } = await import("@solana/web3.js")

      // Create stake instruction
      const instruction = await program.methods
        .stake(stakeAmount)
        .accounts({
          user: publicKey,
          pool: poolPda,
          userStake: userStakePda,
          mint: mint,
          userTokenAccount: userTokenAccount,
          tokenVault: tokenVault,
          adminTokenAccount: adminTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()

      // Create and send transaction
      const transaction = new Transaction().add(instruction)
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Sign transaction with wallet
      const signedTransaction = await window.solana.signTransaction(transaction)

      // Send transaction
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      )

      // Confirm transaction
      await connection.confirmTransaction(signature, "confirmed")
      alert("Stake successful!")
      setTxSig(signature)
      setAmount("")

      // Refresh account data after successful stake
      const updatedData = await getAccountData()
      setAccountData(updatedData)

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose()
        setTxSig("")
      }, 3000)
    } catch (err) {
      console.error("Staking error:", err)
      alert(`Staking failed: ${err.message}`)
      if (err.message.includes("User rejected")) {
        setError("Transaction cancelled by user")
      } else if (err.message.includes("insufficient funds")) {
        setError("Insufficient SOL for transaction fees")
      } else if (err.message.includes("insufficient")) {
        setError("Insufficient token balance")
      } else if (err.message.includes("0x1")) {
        setError("Pool not initialized or insufficient balance")
      } else if (err.message.includes("AmountTooSmall")) {
        setError("Amount below minimum stake requirement")
      } else if (
        err.message.includes("InvalidProgramId") ||
        err.message.includes("0xbc0")
      ) {
        setError("Invalid program configuration - please refresh and try again")
      } else if (err.message.includes("Non-base58")) {
        setError("Invalid address format - please refresh and try again")
      } else {
        setError(`Staking failed: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError("")
      setTxSig("")
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(228,28,35,0.85)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="card"
        style={{
          minWidth: 340,
          maxWidth: 400,
          borderRadius: "22px",
          border: "var(--border-thick)",
          background:
            "linear-gradient(180deg, var(--bg-red-dark), var(--bg-red-darker))",
          boxShadow:
            "0 18px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)",
        }}
      >
        <h2
          style={{
            margin: "0 0 18px",
            fontSize: "22px",
            fontWeight: 900,
            color: "var(--gold)",
          }}
        >
          Stake Tokens
        </h2>

        {/* Account Info Display */}
        {walletConnected && publicKey && (
          <div
            style={{
              background: "rgba(255,215,0,0.1)",
              padding: "8px 12px",
              borderRadius: "8px",
              marginBottom: "12px",
              border: "1px solid rgba(255,215,0,0.2)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              Wallet: {publicKey.toString().slice(0, 4)}...
              {publicKey.toString().slice(-4)}
            </div>
            {accountData && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginTop: "2px",
                }}
              >
                Pools: {accountData.pools.length} | Stakes:{" "}
                {accountData.userStakes.length}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label
            style={{ display: "block", marginBottom: 12, fontWeight: 500 }}
          >
            <span style={{ color: "var(--muted)" }}>Select Pool</span>
            <select
              value={selectedPool}
              onChange={(e) => {
                setSelectedPool(e.target.value)
                setError("") // Clear error when changing pools
              }}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "12px",
                borderRadius: "14px",
                border: "var(--border-thin)",
                background: "rgba(255,255,255,.06)",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: "16px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <option value="Pool 1">
                🍔 McFlex Pool (Instant, Lower APY)
              </option>
              <option value="Pool 2">
                🍟 McLock Pool (7d lock, Higher APY)
              </option>
            </select>
          </label>

          <label
            style={{ display: "block", marginBottom: 12, fontWeight: 500 }}
          >
            <span style={{ color: "var(--muted)" }}>Stake Amount</span>
            <input
              type="number"
              min="0"
              step="0.000001"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError("") // Clear error when typing
              }}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "12px",
                borderRadius: "14px",
                border: "var(--border-thin)",
                background: "rgba(255,255,255,.06)",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: "16px",
              }}
              placeholder="Enter amount"
            />
          </label>

          {/* Pool info display */}
          <div
            style={{
              background: "rgba(255,215,0,0.1)",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,215,0,0.3)",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                color: "var(--gold)",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {poolConfigs[selectedPool].icon} {poolConfigs[selectedPool].name}
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: "12px",
                marginTop: "4px",
              }}
            >
              {poolConfigs[selectedPool].description}
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: "11px",
                marginTop: "4px",
              }}
            >

            </div>
          </div>
        </div>

        {!walletConnected && (
          <div
            className="small"
            style={{
              color: "var(--red-accent)",
              marginBottom: 12,
              textAlign: "center",
              background: "rgba(244,67,54,0.1)",
              padding: "8px",
              borderRadius: "8px",
            }}
          >
            🔒 Please connect your wallet to stake.
          </div>
        )}

        {error && (
          <div
            className="small"
            style={{
              color: "var(--red-accent)",
              marginBottom: 12,
              textAlign: "center",
              background: "rgba(244,67,54,0.1)",
              padding: "8px",
              borderRadius: "8px",
            }}
          >
            ❌ {error}
          </div>
        )}

        {txSig && (
          <div
            className="small"
            style={{
              color: "var(--gold)",
              marginBottom: 12,
              textAlign: "center",
              background: "rgba(255,215,0,0.1)",
              padding: "8px",
              borderRadius: "8px",
            }}
          >
            🎉 Success! Tx:{" "}
            <a
              href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--gold)", textDecoration: "underline" }}
            >
              {txSig.slice(0, 8)}...
            </a>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            className="btn gold"
            style={{ flex: 1, fontWeight: 900, fontSize: "16px" }}
            disabled={
              !walletConnected || !amount || loading || parseFloat(amount) <= 0
            }
            onClick={handleStake}
          >
            {loading ? (
              <>
                <span style={{ marginRight: "8px" }}>🍟</span>
                Staking...
              </>
            ) : (
              "Confirm Stake"
            )}
          </button>
          <button
            className="btn ghost"
            style={{ flex: 1, fontWeight: 900, fontSize: "16px" }}
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              marginTop: "12px",
              color: "var(--muted)",
              fontSize: "12px",
            }}
          >
            Please confirm the transaction in your wallet...
          </div>
        )}
      </div>
    </div>
  )
}
