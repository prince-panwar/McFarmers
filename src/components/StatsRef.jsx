// src/components/StatsRef.jsx
import React, { useEffect, useState, useCallback } from "react"
import { PublicKey } from "@solana/web3.js"
import { Buffer } from "buffer"
import { connection, program, getAccountData } from "../anchor/setup"

export default function StatsRef({ onWalletChange }) {
  const [tvl, setTvl] = useState(0)
  const [wallet, setWallet] = useState("")
  const [ref, setRef] = useState("")

  // Fetch TVL from on-chain Pool accounts
  useEffect(() => {
    let canceled = false

    async function fetchTVL() {
      try {
        if (!program || !connection) return

        const poolTypes = ["flexible", "locked"]
        let total = 0

        for (const poolType of poolTypes) {
          // Pool PDA: seeds = ["pool", pool_type.to_seed()] with to_seed -> "flexible" | "locked"
          const [poolPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool"), Buffer.from(poolType)],
            program.programId
          )

          const poolAcc = await program.account.pool.fetch(poolPda)

          // Obtain mint decimals
          let decimals = 6
          try {
            const { getMint } = await import("@solana/spl-token")
            const mintInfo = await getMint(connection, poolAcc.mint)
            if (mintInfo && typeof mintInfo.decimals === "number") {
              decimals = mintInfo.decimals
            }
          } catch (e) {
            console.warn("Mint decimals fetch failed; defaulting to 6", e)
          }

          // total_staked is u64 (BN); scale to UI units
          const raw =
            typeof poolAcc.totalStaked?.toNumber === "function"
              ? poolAcc.totalStaked.toNumber()
              : Number(poolAcc.totalStaked || 0)

          total += raw / Math.pow(10, decimals)
        }

        if (!canceled) setTvl(total) // token-denominated TVL across pools
      } catch (e) {
        console.error("Failed to fetch TVL:", e)
      }
    }

    fetchTVL()
    const id = setInterval(fetchTVL, 30_000)
    return () => {
      canceled = true
      clearInterval(id)
    }
  }, [])

  const notifyParent = useCallback((connected, address) => {
    onWalletChange?.({ connected, address })
  }, [onWalletChange])

  // Phantom provider
  const getProvider = () => {
    const anyWin = window
    if ("solana" in anyWin && anyWin.solana?.isPhantom) {
      return anyWin.solana
    }
    return null
  }

  const updateReferral = (address) => {
    if (!address) {
      setRef("")
      return
    }
    setRef(`${window.location.origin}/?ref=${address}`)
  }

  // Detect existing connection and attach listeners
  useEffect(() => {
    const provider = getProvider()
    if (!provider) return

    if (provider.isConnected && provider.publicKey) {
      const addr = provider.publicKey.toString()
      setWallet(addr)
      updateReferral(addr)
      notifyParent(true, addr)
      console.log("Wallet is already connected:", addr)
    }

    const onConnect = (publicKey) => {
      const addr = publicKey?.toString?.() || ""
      setWallet(addr)
      updateReferral(addr)
      notifyParent(true, addr)
    }

    const onDisconnect = () => {
      setWallet("")
      updateReferral("")
      notifyParent(false, "")
    }

    provider.on?.("connect", onConnect)
    provider.on?.("disconnect", onDisconnect)

    return () => {
      try {
        provider.removeAllListeners?.("connect")
        provider.removeAllListeners?.("disconnect")
      } catch {}
    }
  }, [notifyParent])

  // Header event bridge
  useEffect(() => {
    const onHeaderConnect = async () => { await connect() }
    const onHeaderDisconnect = async () => { await disconnect() }
    window.addEventListener("mc-connect-wallet", onHeaderConnect)
    window.addEventListener("mc-disconnect-wallet", onHeaderDisconnect)
    return () => {
      window.removeEventListener("mc-connect-wallet", onHeaderConnect)
      window.removeEventListener("mc-disconnect-wallet", onHeaderDisconnect)
    }
  }, [])

  // Real connect using Phantom
  async function connect() {
    const provider = getProvider()
    if (!provider) {
      alert("No Solana wallet found. Please install Phantom.")
      return
    }
    try {
      const res = await provider.connect()
      const addr = res?.publicKey?.toString?.() || provider.publicKey?.toString?.() || ""
      setWallet(addr)
      updateReferral(addr)
      notifyParent(true, addr)
    } catch (e) {
      console.error("Failed to connect wallet:", e)
      alert("Failed to connect wallet.")
    }
  }

  // Real disconnect
  async function disconnect() {
    const provider = getProvider()
    if (!provider) return
    try {
      await provider.disconnect()
      setWallet("")
      updateReferral("")
      notifyParent(false, "")
    } catch (e) {
      console.error("Failed to disconnect:", e)
    }
  }

  function copyRef() {
    if (!ref) return
    navigator.clipboard?.writeText(ref)
  }

  return (
    <aside className="card">
      <h2>McFarmerz — Get hired today!</h2>

      <p className="small" style={{ marginTop: "6px", lineHeight: "1.4em" }}>
        the first degen APY staking protocol to take over the trenches. <br />
        DeFi moves in cycles, and we are here to capitalize on that. <br />
        Ready to convert all sidelined liquidity into the next DeFi surge.
      </p>

      <div className="kpis" style={{ marginTop: 14 }}>
        <div className="kpi">
          <div className="label">TVL</div>
          <div className="value">~{tvl.toLocaleString()}</div>
        </div>
        <div className="kpi">
          <div className="label">Your Wallet</div>
          <div className="value">
            {wallet ? `${wallet.slice(0, 4)}..${wallet.slice(-4)}` : "Disconnected"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">Network</div>
          <div className="value">SOL</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn primary" onClick={wallet ? disconnect : connect}>
          {wallet ? "Disconnect" : "Connect Wallet"}
        </button>
        <button className="btn gold">Buy $MCF</button>
        <button className="btn ghost" disabled style={{ opacity: .5, cursor: "not-allowed" }}>
          Buy $FRIES🍟
        </button>
      </div>

      <hr style={{ opacity: .2, margin: "16px 0" }} />

      <h3 style={{ margin: "0 0 6px" }}>BECOME A MANAGER</h3>
      <p className="small" style={{ marginTop: 0 }}>
        Recruit using your link for more liquidity and bigger bonuses!
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
        <input
          type="text"
          placeholder="Your referral link"
          readOnly
          value={ref || "Connect wallet to generate ref"}
        />
        <button className="btn ghost" onClick={copyRef} disabled={!ref}>Copy</button>
      </div>
    </aside>
  )
}
