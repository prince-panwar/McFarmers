import React, { useEffect, useMemo, useState, useCallback } from "react"
import { PublicKey, Transaction } from "@solana/web3.js"
import { BN } from "bn.js"
import "../Styles.css"
import { connection, program } from "../anchor/setup"

// Stable seed encoder for browser
const enc = new TextEncoder()
const SEED_USER = enc.encode("user")
const SEED_POOL = enc.encode("pool")
const SEED_FLEX = enc.encode("flexible")
const SEED_LOCK = enc.encode("locked")

const ADMIN_OWNER = new PublicKey("GdLfQn7SkU2MCH4vH1Q7cY8q3feHwhRFGJjHXNkRK3hS")
const SECS_PER_YEAR = 365 * 24 * 60 * 60

// Robust send + confirm using lastValidBlockHeight to avoid duplicate-submit issues
async function sendAndConfirmOnce(connection, tx, signer) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" }) // [web:420]
  tx.recentBlockhash = blockhash
  tx.feePayer = signer
  const signed = await window.solana.signTransaction(tx)
  const raw = signed.serialize()
  const sig = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 3,
  })
  try {
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed") // [web:420]
    return { signature: sig, status: "confirmed" }
  } catch (e) {
    const st = await connection.getSignatureStatus(sig, { searchTransactionHistory: true })
    const conf = st?.value?.confirmationStatus
    if (conf === "confirmed" || conf === "finalized") return { signature: sig, status: conf || "confirmed" }
    throw e
  }
}

export default function UnstakeModal({ open, onClose, walletConnected }) {
  const [publicKey, setPublicKey] = useState(null)
  const [lots, setLots] = useState([])
  const [activePoolTab, setActivePoolTab] = useState("flexible")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [txSig, setTxSig] = useState("")
  const [amount, setAmount] = useState("")
  const [selected, setSelected] = useState(null)

  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), [])

  useEffect(() => {
    if (!open || !walletConnected || !window.solana?.publicKey) return
    setPublicKey(window.solana.publicKey)
  }, [open, walletConnected])

  const derivePoolPda = (label) => {
    const seed = label === "locked" ? SEED_LOCK : SEED_FLEX
    const [pda] = PublicKey.findProgramAddressSync([SEED_POOL, seed], program.programId)
    return pda
  }

  const fetchAllLots = useCallback(async () => {
    if (!publicKey) return
    setError("")
    setLoading(true)
    try {
      // 1) fetch all user stakes via memcmp user at offset 8
      const userStakes = await program.account.userStake.all([
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ]) // [web:68]

      const out = []
      const { getMint } = await import("@solana/spl-token")

      for (const s of userStakes) {
  const label = s.account.poolType?.locked !== undefined ? "locked" : "flexible"
  const poolSeed = label === "locked" ? SEED_LOCK : SEED_FLEX
  const [poolPda] = PublicKey.findProgramAddressSync([SEED_POOL, poolSeed], program.programId) // [web:68]

  let poolAcc = null
  try { poolAcc = await program.account.pool.fetch(poolPda) } catch {}
  if (!poolAcc) continue

  const mintPk = new PublicKey(poolAcc.mint)
  const { getMint } = await import("@solana/spl-token")
  const mintInfo = await getMint(connection, mintPk).catch(() => ({ decimals: 6 }))
  const decimals = mintInfo.decimals ?? 6

  const amtRaw = typeof s.account.amount?.toNumber === "function" ? s.account.amount.toNumber() : Number(s.account.amount || 0)
  if (amtRaw <= 0) continue // hide fully withdrawn stakes [web:163]

  const amountUi = amtRaw / 10 ** decimals

  const lastStakeSec = typeof s.account.lastStakeTime?.toNumber === "function" ? s.account.lastStakeTime.toNumber() : Number(s.account.lastStakeTime || 0)

  const apyBp = typeof poolAcc.apy?.toNumber === "function" ? poolAcc.apy.toNumber() : Number(poolAcc.apy || 0)
  const elapsed = Math.max(0, nowSec - lastStakeSec)
  const rewardRaw = (amtRaw * apyBp * elapsed) / 10000 / (365 * 24 * 60 * 60)
  const rewardUi = rewardRaw / 10 ** decimals

  const lockPeriod = typeof poolAcc.lockPeriod?.toNumber === "function" ? poolAcc.lockPeriod.toNumber() : Number(poolAcc.lockPeriod || 0)
  const unlockSec = label === "locked" ? lastStakeSec + lockPeriod : 0
  const unlockIn = label === "locked" ? Math.max(0, unlockSec - nowSec) : 0
  const isLocked = label === "locked" && unlockIn > 0

  const index = typeof s.account.index?.toNumber === "function" ? s.account.index.toNumber() : Number(s.account.index || 0)

  out.push({
    key: s.publicKey.toBase58(),
    userStakePda: s.publicKey,
    poolPda,
    poolType: label,
    mint: mintPk,
    decimals,
    amountRaw: amtRaw,
    amountUi,
    apyBp,
    lastStake: lastStakeSec ? new Date(lastStakeSec * 1000) : null,
    rewardUi,
    unlockIn,
    unlockAt: unlockSec ? new Date(unlockSec * 1000) : null,
    isLocked,
    index,
  })
}


      out.sort((a, b) => {
        if (a.poolType !== b.poolType) return a.poolType.localeCompare(b.poolType)
        if (a.poolType === "locked") return a.unlockIn - b.unlockIn
        return (b.lastStake?.getTime?.() || 0) - (a.lastStake?.getTime?.() || 0)
      })

      setLots(out)
      setSelected(null)
      setAmount("")
      setTxSig("")
    } catch (e) {
      console.error("fetchAllLots error:", e)
      setLots([])
    } finally {
      setLoading(false)
    }
  }, [publicKey, nowSec])

  useEffect(() => {
    if (!open || !walletConnected || !publicKey) return
    fetchAllLots()
    const id = setInterval(() => fetchAllLots(), 30000)
    return () => clearInterval(id)
  }, [open, walletConnected, publicKey, fetchAllLots])

  const handleUnstake = useCallback(async () => {
    setError("")
    setTxSig("")
    if (!walletConnected || !publicKey) { setError("Please connect wallet"); return } // [web:68]
    if (!selected) { setError("Select a stake entry"); return }
    const amt = Number(amount)
    if (!(amt > 0)) { setError("Amount must be greater than 0"); return }
    if (amt > selected.amountUi + 1e-12) { setError(`Max: ${selected.amountUi.toFixed(selected.decimals)}`); return }
    if (selected.isLocked) { setError("Tokens are still locked - withdrawal not allowed yet"); return } // [web:68]

    setLoading(true)
    try {
      const { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } =
        await import("@solana/spl-token")

      // Recompute expected userStake PDA from seeds and index (defensive)
    const poolSeed = selected.poolType === "locked" ? SEED_LOCK : SEED_FLEX
const idxLE = new Uint8Array(8)
new DataView(idxLE.buffer).setBigInt64(0, BigInt(selected.index || 0), true) // i64 LE [web:68]
const [expectedUserStake] = PublicKey.findProgramAddressSync(
  [SEED_USER, publicKey.toBuffer(), poolSeed, idxLE],
  program.programId
)

      if (expectedUserStake.toBase58() !== selected.userStakePda.toBase58()) {
        setError("Lot reference changed. Refresh and retry.")
        setLoading(false)
        return
      }

      const poolPda = selected.poolPda
      const mint = selected.mint

      // ATAs under same token program family used by mint
      const userTokenAccount = await getAssociatedTokenAddress(mint, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID) // [web:386]
      const tokenVault = await getAssociatedTokenAddress(mint, poolPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID) // [web:386]
      const adminTokenAccount = await getAssociatedTokenAddress(mint, ADMIN_OWNER, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID) // [web:386]

      // Strict BN usage for both arguments to avoid toTwos issues
      const mult = 10 ** selected.decimals
      const withdrawAmountRaw = new BN((amt * mult).toFixed(0)) // BN u64 [web:411]
      const indexBN = new BN(selected.index) // BN i64 [web:411]

      const ix = await program.methods
        .withdraw(withdrawAmountRaw, indexBN)
        .accounts({
          user: publicKey,
          pool: poolPda,
          userStake: expectedUserStake,
          mint,
          userTokenAccount,
          tokenVault,
          adminTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction() // [web:68]

      const tx = new Transaction().add(ix)
      const { signature } = await sendAndConfirmOnce(connection, tx, publicKey) // robust, single-send [web:420]
      setTxSig(signature)

      await fetchAllLots()
      setAmount("")
      setSelected(null)
    } catch (e) {
      console.error("Unstake error:", e)
      const msg = e?.message || String(e)
      if (msg.includes("already been processed")) {
        setTxSig(prev => prev || "Processed") // treat as success if earlier branch set it
      } else if (msg.includes("ConstraintSeeds")) setError("Lot changed or index mismatch. Refresh and retry.") // [web:388]
      else if (msg.includes("StillLocked")) setError("Tokens are still locked - withdrawal not allowed yet") // [web:68]
      else if (msg.includes("InsufficientStake")) setError("Insufficient staked amount") // [web:68]
      else if (msg.includes("AmountTooSmall")) setError("Withdrawal amount too small") // [web:68]
      else if (msg.includes("User rejected")) setError("Transaction cancelled by user") // [web:68]
      else setError(`Withdrawal failed: ${msg}`) // [web:68]
    } finally {
      setLoading(false)
    }
  }, [walletConnected, publicKey, selected, amount, fetchAllLots])

  if (!open) return null

  const filtered = lots.filter((l) => l.poolType === activePoolTab)

  return (
  <div
  className="modal-overlay"
  style={{
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",  // translucent backdrop [web:446]
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>

      <div
        className="card"
        style={{
          position: "relative",
          minWidth: 360, maxWidth: 520,
          borderRadius: 22, border: "var(--border-thick)",
          background: "linear-gradient(180deg, var(--bg-red-dark), var(--bg-red-darker))",
          boxShadow: "0 18px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)",
          overflow: "hidden",
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 5,
            }}
          >
            <div className="spinner" />
            <span style={{ marginLeft: 10, color: "white", fontWeight: 700 }}>Loading...</span>
          </div>
        )}

        <h2 style={{ margin: "12px 12px 8px", fontSize: 22, fontWeight: 900, color: "var(--gold)" }}>Your Stakes</h2>

        <div style={{ display: "flex", gap: 8, margin: "0 12px 12px" }}>
          {["flexible", "locked"].map((tab) => (
            <button
              key={tab}
              onClick={() => { if (!loading) { setActivePoolTab(tab); setSelected(null); setAmount(""); setError("") } }}
              className="btn"
              style={{
                flex: 1, fontWeight: 800,
                background: activePoolTab === tab ? "var(--gold)" : "transparent",
                color: activePoolTab === tab ? "black" : "var(--text)",
                borderColor: activePoolTab === tab ? "var(--gold)" : "var(--border)",
              }}
              disabled={loading}
            >
              {tab === "flexible" ? "Flexible" : "Locked"}
            </button>
          ))}
        </div>

        <div style={{ margin: "0 12px 12px", maxHeight: 320, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div className="small" style={{ color: "var(--muted)", textAlign: "center", padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
              No stakes in this pool
            </div>
          ) : (
            filtered.map((p) => {
              const isSel = selected?.key === p.key
              const unlockLabel =
                p.poolType === "locked"
                  ? p.isLocked
                    ? `Unlocks on ${p.unlockAt?.toLocaleString?.() || "-"}`
                    : "Unlocked"
                  : "Flexible"
              return (
                <div
                  key={p.key}
                  onClick={() => { if (!loading) { setSelected(p); setAmount(""); setError("") } }}
                  style={{
                    cursor: loading ? "not-allowed" : "pointer",
                    padding: 10, marginBottom: 8, borderRadius: 10,
                    border: isSel ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)",
                    background: isSel ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--gold)" }}>
                      {p.poolType === "locked" ? "Locked" : "Flexible"} • index {p.index}
                    </span>
                    <span style={{ color: "var(--muted)" }}>{unlockLabel}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12 }}>
                    <span className="muted">Staked</span>
                    <span>{p.amountUi.toFixed(6)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 12 }}>
                    <span className="muted">Accrued reward</span>
                    <span>{p.rewardUi.toFixed(6)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 12 }}>
                    <span className="muted">Last stake</span>
                    <span>{p.lastStake ? p.lastStake.toLocaleString() : "-"}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {!!selected && (
          <div style={{ margin: "0 12px 12px" }}>
            <label className="small" style={{ display: "block", marginBottom: 8 }}>
              Withdrawal Amount
              <div style={{ position: "relative" }}>
                <input
                  type="number" min="0" step="0.000001"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError("") }}
                  disabled={loading}
                  className="mcstake-input"
                  placeholder={`Max: ${selected.amountUi.toFixed(6)}`}
                />
                <button
                  onClick={() => setAmount(selected.amountUi.toString())}
                  disabled={loading}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "var(--gold)", color: "black", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700,
                  }}
                >
                  MAX
                </button>
              </div>
            </label>

            {selected.poolType === "locked" && (
              <div className="small" style={{ color: selected.isLocked ? "var(--red-accent)" : "var(--muted)", marginBottom: 8 }}>
                {selected.isLocked ? `🔒 Unstake available on ${selected.unlockAt?.toLocaleString?.() || "-"}` : "Unlocked"}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="small" style={{ color: "var(--red-accent)", margin: "0 12px 12px", textAlign: "center", background: "rgba(244,67,54,0.1)", padding: 8, borderRadius: 8 }}>
            ❌ {error}
          </div>
        )}
        {txSig && (
          <div className="small" style={{ color: "var(--gold)", margin: "0 12px 12px", textAlign: "center", background: "rgba(255,215,0,0.1)", padding: 8, borderRadius: 8 }}>
            🎉 Success! Tx:{" "}
            <a href={`https://solscan.io/tx/${txSig}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", textDecoration: "underline" }}>
              {txSig.slice(0, 8)}...
            </a>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, margin: "0 12px 12px" }}>
          <button
            className="btn"
            style={{ flex: 1, fontWeight: 900, fontSize: 16, background: "var(--gold)", color: "black" }}
            disabled={!walletConnected || !publicKey || loading || !selected || !Number(amount)}
            onClick={handleUnstake}
          >
            {loading ? "Processing..." : "Confirm Unstake"}
          </button>
          <button className="btn ghost" style={{ flex: 1, fontWeight: 900, fontSize: 16 }} disabled={loading} onClick={() => { if (!loading) { setError(""); setTxSig(""); onClose() } }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
