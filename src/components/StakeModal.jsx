import React, { useState, useEffect, useCallback } from "react"
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js"
import { BN } from "@coral-xyz/anchor"
import { Buffer } from "buffer"
import "../Styles.css"
import { connection, program, getAccountData } from "../anchor/setup"

const SEED_POOL = Buffer.from("pool")
const SEED_USER = Buffer.from("user")

const poolConfigs = {
  "Pool 1": { type: "flexible", name: "McFlex Pool", icon: "🍔", description: "Instant withdrawals, Lower APY" },
  "Pool 2": { type: "locked", name: "McLock Pool", icon: "🍟", description: "7-day lock, Higher APY" },
}

export default function StakeModal({ open, onClose, walletConnected }) {
  const [selectedPool, setSelectedPool] = useState("Pool 1")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState("")
  const [error, setError] = useState("")
  const [accountData, setAccountData] = useState({ pools: [], userStakes: [] })
  const [publicKey, setPublicKey] = useState(null)

  // Detect wallet and fetch initial data
  useEffect(() => {
    const boot = async () => {
      if (!open || !walletConnected || !window.solana?.publicKey) return
      setPublicKey(window.solana.publicKey)
      try {
        const data = await getAccountData(window.solana.publicKey)
        setAccountData(data || { pools: [], userStakes: [] })
      } catch (e) {
        console.error("Initial getAccountData error:", e)
      }
    }
    boot()
  }, [open, walletConnected])

  const isValidAmount = (v) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0
  }

  const handleStake = useCallback(async () => {
    setError("")
    setTxSig("")
    try {
      // Basic guards
      if (!walletConnected || !window.solana?.publicKey) {
        setError("Please connect wallet")
        return
      } // [web:68]
      const userPk = window.solana.publicKey // signer key [web:68]
      if (!isValidAmount(amount)) {
        setError("Amount must be greater than 0")
        return
      } // [web:68]

      setLoading(true)

      // Resolve pool type and seed
      const poolType = poolConfigs[selectedPool]?.type === "locked" ? "locked" : "flexible" // "flexible" or "locked" [web:33]
      const poolSeedBuf = Buffer.from(poolType) // must match Rust to_seed() [web:33]

      // Match pool from accountData to get mint
      const matchingPool = accountData?.pools?.find((p) => {
        const t = p.account.poolType
        return poolType === "locked" ? t.locked !== undefined : t.flexible !== undefined
      })
      if (!matchingPool) {
        setError(`${poolType} pool not found`)
        setLoading(false)
        return
      } // [web:68]

      // Derive pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [SEED_POOL, poolSeedBuf],
        program.programId
      ) // [web:33]

      // Fetch pool now to get latest stake_counter (avoid seed race)
      const poolAcc = await program.account.pool.fetch(poolPda) // [web:68]
      const stakeCounter = typeof poolAcc.stakeCounter?.toNumber === "function"
        ? poolAcc.stakeCounter.toNumber()
        : Number(poolAcc.stakeCounter || 0) // i64 value [web:33]

      // Derive user_stake PDA with index = stakeCounter (i64 LE)
      const idxLE = new Uint8Array(8)
      new DataView(idxLE.buffer).setBigInt64(0, BigInt(stakeCounter), true) // little-endian i64 [web:341]
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [SEED_USER, userPk.toBuffer(), poolSeedBuf, Buffer.from(idxLE)],
        program.programId
      ) // [web:33]

      // Mint and decimals
      const mintPk = new PublicKey(matchingPool.account.mint)
      const {
        getMint,
        getAssociatedTokenAddress,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
      } = await import("@solana/spl-token") // [web:237]
      const mintInfo = await getMint(connection, mintPk).catch(() => ({ decimals: 6 })) // [web:237]
      const tokenDecimals = mintInfo.decimals ?? 6 // [web:237]

      // Convert amount UI -> raw BN
      const n = Number(amount)
      const mult = 10 ** tokenDecimals
      // Avoid float precision edge-cases; toFixed(0) for integer string then BN
      const amountRaw = new BN((n * mult).toFixed(0)) // [web:68]

      // Validate min stake from pool
      const minStake = typeof poolAcc.minStake?.toNumber === "function"
        ? poolAcc.minStake.toNumber()
        : Number(poolAcc.minStake || 0) // [web:68]
      if (amountRaw.toNumber() < minStake) {
        setError(`Minimum stake required: ${minStake / mult} tokens`)
        setLoading(false)
        return
      } // [web:68]

      // Resolve ATAs: user, pool vault (authority=pool PDA), admin
      const userTokenAccount = await getAssociatedTokenAddress(
        mintPk, userPk, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      ) // [web:237]
      const tokenVault = await getAssociatedTokenAddress(
        mintPk, poolPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      ) // [web:237]
      const adminOwner = new PublicKey("GdLfQn7SkU2MCH4vH1Q7cY8q3feHwhRFGJjHXNkRK3hS")
      const adminTokenAccount = await getAssociatedTokenAddress(
        mintPk, adminOwner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      ) // [web:237]

      // Build stake ix
      const ix = await program.methods
        .stake(amountRaw)
        .accounts({
          user: userPk,
          pool: poolPda,
          userStake: userStakePda,
          mint: mintPk,
          userTokenAccount,
          tokenVault,
          adminTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction() // [web:68]

      // Send transaction
      const { blockhash } = await connection.getLatestBlockhash() // [web:68]
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: userPk }).add(ix) // [web:68]
      const signed = await window.solana.signTransaction(tx) // [web:68]
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      }) // [web:68]
      await connection.confirmTransaction(sig, "confirmed") // [web:68]
      setTxSig(sig)

      // Refresh account data for UI
      const updated = await getAccountData(userPk)
      setAccountData(updated || { pools: [], userStakes: [] })
      setAmount("")
    } catch (e) {
      console.error("Staking error:", e)
      const msg = e?.message || String(e)
      if (msg.includes("ConstraintSeeds")) setError("Please retry: index changed or seeds mismatch") // seeds race or mismatch [web:27]
      else if (msg.includes("AmountTooSmall")) setError("Amount below minimum stake") // program error surfaced [web:68]
      else if (msg.includes("User rejected")) setError("Transaction cancelled by user") // wallet rejection [web:68]
      else setError(`Staking failed: ${msg}`) // general fallback [web:68]
    } finally {
      setLoading(false)
    }
  }, [walletConnected, accountData, selectedPool, amount])

  const handleClose = () => {
    if (loading) return
    setError("")
    setTxSig("")
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
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
          minWidth: 340, maxWidth: 400,
          borderRadius: 22, border: "var(--border-thick)",
          background: "linear-gradient(180deg, var(--bg-red-dark), var(--bg-red-darker))",
          boxShadow: "0 18px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)",
        }}
      >
        <h2 style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 900, color: "var(--gold)" }}>
          Stake Tokens
        </h2>

        {walletConnected && window.solana?.publicKey && (
          <div style={{
            background: "rgba(255,215,0,0.1)",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 12,
            border: "1px solid rgba(255,215,0,0.2)",
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Wallet: {window.solana.publicKey.toBase58().slice(0, 4)}...{window.solana.publicKey.toBase58().slice(-4)}
            </div>
            {accountData && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                Pools: {accountData.pools?.length || 0} | Stakes: {accountData.userStakes?.length || 0}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>
            <span style={{ color: "var(--muted)" }}>Select Pool</span>
            <select
              value={selectedPool}
              onChange={(e) => { setSelectedPool(e.target.value); setError("") }}
              disabled={loading}
              style={{
                width: "100%", marginTop: 8, padding: "12px",
                borderRadius: 14, border: "var(--border-thin)",
                background: "rgba(255,255,255,.06)", color: "var(--text)",
                fontWeight: 700, fontSize: 16,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <option value="Pool 1">🍔 McFlex Pool (Instant, Lower APY)</option>
              <option value="Pool 2">🍟 McLock Pool (7d lock, Higher APY)</option>
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>
            <span style={{ color: "var(--muted)" }}>Stake Amount</span>
            <input
              type="number" min="0" step="0.000001"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError("") }}
              disabled={loading}
              style={{
                width: "100%", marginTop: 8, padding: "12px",
                borderRadius: 14, border: "var(--border-thin)",
                background: "rgba(255,255,255,.06)", color: "var(--text)",
                fontWeight: 700, fontSize: 16,
              }}
              placeholder="Enter amount"
            />
          </label>

          <div style={{
            background: "rgba(255,215,0,0.1)", padding: 12, borderRadius: 10,
            border: "1px solid rgba(255,215,0,0.3)", marginBottom: 12,
          }}>
            <div style={{ color: "var(--gold)", fontSize: 14, fontWeight: 600 }}>
              {poolConfigs[selectedPool].icon} {poolConfigs[selectedPool].name}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
              {poolConfigs[selectedPool].description}
            </div>
          </div>

          <div style={{
            background: "rgba(244,67,54,0.1)", padding: 12, borderRadius: 10,
            border: "1px solid rgba(244,67,54,0.3)", marginBottom: 12,
          }}>
            <div style={{ color: "var(--red-accent)", fontSize: 14, fontWeight: 600 }}>
              ⚠️ Stake Fees
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
              2% stake fee will be deducted on deposit
            </div>
          </div>
        </div>

        {!walletConnected && (
          <div className="small" style={{
            color: "var(--red-accent)", marginBottom: 12, textAlign: "center",
            background: "rgba(244,67,54,0.1)", padding: 8, borderRadius: 8,
          }}>
            🔒 Please connect your wallet to stake.
          </div>
        )}

        {error && (
          <div className="small" style={{
            color: "var(--red-accent)", marginBottom: 12, textAlign: "center",
            background: "rgba(244,67,54,0.1)", padding: 8, borderRadius: 8,
          }}>
            ❌ {error}
          </div>
        )}

        {txSig && (
          <div className="small" style={{
            color: "var(--gold)", marginBottom: 12, textAlign: "center",
            background: "rgba(255,215,0,0.1)", padding: 8, borderRadius: 8,
          }}>
            🎉 Success! Tx:{" "}
            <a
              href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--gold)", textDecoration: "underline" }}
            >
              {txSig.slice(0, 8)}...
            </a>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            className="btn gold"
            style={{ flex: 1, fontWeight: 900, fontSize: 16 }}
            disabled={!walletConnected || loading || !isValidAmount(amount)}
            onClick={handleStake}
          >
            {loading ? (<><span style={{ marginRight: 8 }}>🍟</span>Staking...</>) : "Confirm Stake"}
          </button>
          <button className="btn ghost" style={{ flex: 1, fontWeight: 900, fontSize: 16 }} onClick={handleClose} disabled={loading}>
            Cancel
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
            Please confirm the transaction in your wallet...
          </div>
        )}
      </div>
    </div>
  )
}
