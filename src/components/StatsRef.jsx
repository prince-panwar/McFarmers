import React, { useEffect, useState, useCallback } from "react"

export default function StatsRef({ onWalletChange }) {
  const [tvl, setTvl] = useState(0)
  const [wallet, setWallet] = useState("")
  const [ref, setRef] = useState("")

  // Animate TVL
  useEffect(() => {
    let v = 0, target = 300000, step = 6000
    const id = setInterval(() => {
      v += step
      if (v >= target) { v = target; clearInterval(id) }
      setTvl(v)
    }, 20)
    return () => clearInterval(id)
  }, [])

  const notifyParent = useCallback((connected, address) => {
    onWalletChange?.({ connected, address })
  }, [onWalletChange])

  // Helpers
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

  // Eagerly detect already-connected Phantom and attach listeners
  useEffect(() => {
    const provider = getProvider()
    if (!provider) {
      return
    }

    // If already connected on mount
    if (provider.isConnected && provider.publicKey) {
      const addr = provider.publicKey.toString()
      setWallet(addr)
      updateReferral(addr)
      notifyParent(true, addr)
      console.log("Wallet is already connected:", addr)
    }

    // Listeners
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

  // Public actions the header can trigger
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
      const res = await provider.connect() // may prompt the user
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
          <div className="value">~${tvl.toLocaleString()}</div>
        </div>
        <div className="kpi">
          <div className="label">Your Wallet</div>
          <div className="value">{ wallet.slice(0, 4)}..{wallet.slice(-4) || "Disconnected"}</div>
        </div>
        <div className="kpi">
          <div className="label">Network</div>
          <div className="value">SOL</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        {/* This button now does the real Phantom connect */}
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
