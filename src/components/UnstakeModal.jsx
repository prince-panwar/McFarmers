import React, { useState, useEffect } from "react"
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js"
import { BN } from "@coral-xyz/anchor"
import { Buffer } from "buffer"
import "../Styles.css"
import { connection, program, getAccountData } from "../anchor/setup"

export default function UnstakeModal({
  open,
  onClose,
  walletConnected,
  poolType = "flexible",
}) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState("")
  const [error, setError] = useState("")
  const [accountData, setAccountData] = useState(null)
  const [publicKey, setPublicKey] = useState(null)
  const [userStakeData, setUserStakeData] = useState(null)
  const [tokenDecimals, setTokenDecimals] = useState(6)
  const [maxWithdrawable, setMaxWithdrawable] = useState(0)

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

          // Fetch user stake data for current pool type
          await fetchUserStakeData(pk, poolType, data)

          console.log("Account Data:", data)
        } catch (error) {
          console.error("Error fetching data:", error)
        }
      }
    }

    if (open && walletConnected) {
      fetchData()
    }
  }, [open, walletConnected, poolType])

  const fetchUserStakeData = async (
    userPublicKey,
    currentPoolType,
    accountData
  ) => {
    try {
      // Derive user stake PDA
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user"),
          userPublicKey.toBuffer(),
          Buffer.from(currentPoolType),
        ],
        program.programId
      )

      // Fetch user stake account
      const userStakeAccount = await program.account.userStake.fetch(
        userStakePda
      )

      // Find matching pool for token decimals
      const matchingPool = accountData?.pools?.find((pool) => {
        const accountPoolType = pool.account.poolType
        if (currentPoolType === "flexible") {
          return accountPoolType.flexible !== undefined
        } else if (currentPoolType === "locked") {
          return accountPoolType.locked !== undefined
        }
        return false
      })

      if (matchingPool) {
        // Get token decimals
        const { getMint } = await import("@solana/spl-token")
        const mint = matchingPool.account.mint

        try {
          const mintInfo = await getMint(connection, mint)
          setTokenDecimals(mintInfo.decimals)
        } catch (err) {
          console.warn(
            "Failed to fetch token decimals, using default (6):",
            err
          )
        }

        // Calculate max withdrawable amount
        const stakeAmount = userStakeAccount.amount.toNumber()
        const decimalsMultiplier = Math.pow(10, tokenDecimals)
        setMaxWithdrawable(stakeAmount / decimalsMultiplier)

        setUserStakeData({
          ...userStakeAccount,
          stakedAmount: stakeAmount / decimalsMultiplier,
          lastStakeTime: new Date(
            userStakeAccount.lastStakeTime.toNumber() * 1000
          ),
        })
      }
    } catch (error) {
      console.log("No stake found for this pool type:", error)
      setUserStakeData(null)
      setMaxWithdrawable(0)
    }
  }

  const handleUnstake = async () => {
    if (!walletConnected || !publicKey || !amount) {
      setError("Please connect wallet and enter amount")
      return
    }

    if (parseFloat(amount) <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    if (parseFloat(amount) > maxWithdrawable) {
      setError(`Maximum withdrawable: ${maxWithdrawable} tokens`)
      return
    }

    setLoading(true)
    setError("")
    setTxSig("")

    try {
      // Find the matching pool
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
        setError(`${poolType} pool not found`)
        return
      }

      const mint = matchingPool.account.mint

      // Derive PDAs
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolType)],
        program.programId
      )

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
        new PublicKey("GdLfQn7SkU2MCH4vH1Q7cY8q3feHwhRFGJjHXNkRK3hS"),
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Convert amount to token units
      const tokenMultiplier = Math.pow(10, tokenDecimals)
      const withdrawAmount = new BN(parseFloat(amount) * tokenMultiplier)

      console.log("Withdraw calculation:", {
        inputAmount: amount,
        tokenDecimals,
        tokenMultiplier,
        finalWithdrawAmount: withdrawAmount.toString(),
      })

      // Create withdraw instruction
      const instruction = await program.methods
        .withdraw(withdrawAmount)
        .accounts({
          user: publicKey,
          pool: poolPda,
          userStake: userStakePda,
          mint: mint,
          userTokenAccount: userTokenAccount,
          tokenVault: tokenVault,
          adminTokenAccount: adminTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
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
      alert("Unstake successful!")
      setTxSig(signature)
      setAmount("")

      // Refresh data after successful withdrawal
      const updatedData = await getAccountData()
      setAccountData(updatedData)
      await fetchUserStakeData(publicKey, poolType, updatedData)

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose()
        setTxSig("")
      }, 3000)
    } catch (err) {
      console.error("Withdrawal error:", err)
       alert(`Unstake failed: ${err.message}`)
      if (err.message.includes("User rejected")) {
        setError("Transaction cancelled by user")
      } else if (err.message.includes("StillLocked")) {
        setError("Tokens are still locked - withdrawal not allowed yet")
      } else if (err.message.includes("InsufficientStake")) {
        setError("Insufficient staked amount")
      } else if (err.message.includes("AmountTooSmall")) {
        setError("Withdrawal amount too small")
      } else {
        setError(`Withdrawal failed: ${err.message}`)
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

  const setMaxAmount = () => {
    setAmount(maxWithdrawable.toString())
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
          Unstake Tokens
        </h2>

        {/* User Stake Info */}
        {walletConnected && userStakeData && (
          <div
            style={{
              background: "rgba(255,215,0,0.1)",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "12px",
              border: "1px solid rgba(255,215,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "var(--gold)",
                marginBottom: "4px",
              }}
            >
              📊 Your Stake ({poolType})
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              Staked: {userStakeData.stakedAmount.toFixed(6)} tokens
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              Last Stake: {userStakeData.lastStakeTime.toLocaleDateString()}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              Available: {maxWithdrawable.toFixed(6)} tokens
            </div>
          </div>
        )}

        {!userStakeData && walletConnected && (
          <div
            style={{
              background: "rgba(244,67,54,0.1)",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "12px",
              border: "1px solid rgba(244,67,54,0.2)",
            }}
          >
            <div style={{ fontSize: "14px", color: "var(--red-accent)" }}>
              No stake found in {poolType} pool
            </div>
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label
            style={{ display: "block", marginBottom: 12, fontWeight: 500 }}
          >
            <span style={{ color: "var(--muted)" }}>Withdrawal Amount</span>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="0"
                step="0.000001"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError("")
                }}
                disabled={loading || !userStakeData}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "12px",
                  paddingRight: "60px",
                  borderRadius: "14px",
                  border: "var(--border-thin)",
                  background: "rgba(255,255,255,.06)",
                  color: "var(--text)",
                  fontWeight: 700,
                  fontSize: "16px",
                }}
                placeholder={
                  userStakeData ? `Max: ${maxWithdrawable.toFixed(6)}` : "0"
                }
              />
              {userStakeData && (
                <button
                  onClick={setMaxAmount}
                  disabled={loading}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "var(--gold)",
                    color: "black",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  MAX
                </button>
              )}
            </div>
          </label>

          {/* Pool info and fees */}
          <div
            style={{
              background: "rgba(244,67,54,0.1)",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(244,67,54,0.3)",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                color: "var(--red-accent)",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              ⚠️ Withdrawal Fees
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: "12px",
                marginTop: "4px",
              }}
            >
              10% unstake fee will be deducted
            </div>
            {poolType === "locked" && (
              <div
                style={{
                  color: "var(--muted)",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                🔒 Locked pool: 7-day minimum lock period
              </div>
            )}
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
            🔒 Please connect your wallet to unstake.
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
            className="btn"
            style={{
              flex: 1,
              fontWeight: 900,
              fontSize: "16px",
              backgroundColor: "var(--red-accent)",
              borderColor: "var(--red-accent)",
            }}
            disabled={
              !walletConnected ||
              !amount ||
              loading ||
              parseFloat(amount) <= 0 ||
              !userStakeData
            }
            onClick={handleUnstake}
          >
            {loading ? (
              <>
                <span style={{ marginRight: "8px" }}>⏳</span>
                Processing...
              </>
            ) : (
              "Confirm Unstake"
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
