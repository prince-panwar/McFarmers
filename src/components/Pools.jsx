import React, { useState, useEffect } from "react"
import { PublicKey } from "@solana/web3.js"
import { Buffer } from "buffer"
import { connection, program, getAccountData } from "../anchor/setup"

const pools = [
  // Row 1
  {
    title: "$Payroll",
    sub: "Stake $MCF for clean $SOL",
    apr: "589.41%",
    enabled: false,
    icon: "/assets/pool-burgers.png",
    poolType: "flexible",
  },
  {
    title: "$MCF Retirement Pool",
    sub: "Automatic Farming",
    apy: "29,140.46%",
    enabled: true,
    icon: "/assets/pool-auto.png",
    poolType: "flexible",
  },
  {
    title: "$FRIES",
    sub: "Coming soon",
    apr: "777.77%",
    enabled: false,
    icon: "/assets/pool-milkshake.png",
    poolType: "locked",
  },

  // Row 2
  {
    title: "USD1 Reward Pool",
    sub: "Coming soon",
    apr: "1,234.56%",
    enabled: false,
    icon: "/assets/pool-1.png",
    poolType: "locked",
  },
  {
    title: "$BURGER",
    sub: "Coming soon",
    apr: "4,206.90%",
    enabled: false,
    icon: "/assets/pool-milkshake.png",
    poolType: "flexible",
  },
  {
    title: "$MILKSHAKE",
    sub: "Coming soon",
    apr: "9,999.99%",
    enabled: false,
    icon: "/assets/pool-2.png",
    poolType: "locked",
  },
]

export default function Pools({ onStake, onUnstake, walletConnected }) {
  const [userStakeData, setUserStakeData] = useState({})
  const [loading, setLoading] = useState(false)

  // Fetch user stake data for all pools
useEffect(() => {
  let canceled = false
  const fetchAllUserData = async () => {
    if (!walletConnected || !window.solana?.publicKey) return
    setLoading(true)
    try {
      const walletPk = window.solana.publicKey // signer present [web:68]

      // 1) Fetch pools once to resolve mint per pool type
      const acct = await getAccountData(walletPk) // { pools, userStakes } [web:68]
      const poolsArr = acct?.pools || []

      const resolvePoolByType = (typeStr) =>
        poolsArr.find((p) => {
          const t = p.account.poolType
          return typeStr === "locked" ? t?.locked !== undefined : t?.flexible !== undefined
        }) || null // [web:68]

      // 2) Fetch all user stakes for this wallet
      const allStakes = await program.account.userStake.all([
        { memcmp: { offset: 8, bytes: walletPk.toBase58() } },
      ]) // returns all lots owned by wallet [web:68]

      // 3) Group by pool type
      const byType = { flexible: [], locked: [] }
      for (const s of allStakes) {
        const t = s.account.poolType
        if (t?.locked !== undefined) byType.locked.push(s)
        else if (t?.flexible !== undefined) byType.flexible.push(s)
      } // [web:163]

      // 4) Summarize per type: sum amounts, max lastStakeTime, scale by decimals from pool mint
      async function summarize(typeStr) {
        const list = byType[typeStr]
        if (!list.length) return { staked: 0, lastStakeTime: null, hasStake: false }

        // Resolve decimals
        let decimals = 6
        const poolWrap = resolvePoolByType(typeStr)
        if (poolWrap) {
          try {
            const { getMint } = await import("@solana/spl-token")
            const mintInfo = await getMint(connection, new PublicKey(poolWrap.account.mint))
            decimals = typeof mintInfo.decimals === "number" ? mintInfo.decimals : 6
          } catch {
            decimals = 6
          }
        } // [web:68]

        let sumRaw = 0
        let maxTs = 0
        for (const s of list) {
          const raw = typeof s.account.amount?.toNumber === "function"
            ? s.account.amount.toNumber()
            : Number(s.account.amount || 0)
          sumRaw += raw
          const ts = typeof s.account.lastStakeTime?.toNumber === "function"
            ? s.account.lastStakeTime.toNumber()
            : Number(s.account.lastStakeTime || 0)
          if (ts > maxTs) maxTs = ts
        }

        return {
          staked: sumRaw / 10 ** decimals,
          lastStakeTime: maxTs ? new Date(maxTs * 1000) : null,
          hasStake: sumRaw > 0,
        }
      }

      const next = {
        flexible: await summarize("flexible"),
        locked: await summarize("locked"),
      }

      if (!canceled) setUserStakeData(next)
    } catch (e) {
      console.error("Error fetching user stake data:", e)
      if (!canceled) {
        setUserStakeData({
          flexible: { staked: 0, lastStakeTime: null, hasStake: false },
          locked: { staked: 0, lastStakeTime: null, hasStake: false },
        })
      }
    } finally {
      if (!canceled) setLoading(false)
    }
  }

  fetchAllUserData()
  const id = setInterval(() => {
    if (walletConnected) fetchAllUserData()
  }, 30000)
  return () => { canceled = true; clearInterval(id) }
}, [walletConnected])





  return (
    <section className="pools card" style={{ marginTop: 18 }}>
      <h2 style={{ marginBottom: 10 }}>Pools</h2>

      <div className="pool-grid">
        {pools.map((p, idx) => {
          const userData = userStakeData[p.poolType] || {
            staked: 0,
            hasStake: false,
          }

          return (
            <article
              key={idx}
              className={`pool ${p.enabled ? "enabled" : "disabled"}`}
            >
              <div className="pool-hd">
                <img src={p.icon} className="pool-icon" alt={p.title} />
                <div>
                  <div className="pool-title">{p.title}</div>
                  <div className="pool-sub">{p.sub}</div>
                </div>
              </div>

              {p.enabled ? (
                <>
                  <div className="row">
                    <div>APY</div>
                    <div className="num">{p.apy}</div>
                  </div>
                  <div className="row">
                    <div className="muted">Pool Type</div>
                    <div>
                      {p.poolType === "flexible" ? "🍔 Flexible" : "🍟 Locked"}
                    </div>
                  </div>
                  <div className="row">
                    <div className="muted">Your Stake</div>
                    <div>
                      {loading
                        ? "Loading..."
                        : walletConnected
                        ? userData.hasStake
                          ? `${userData.staked.toFixed(6)} MCF`
                          : "0 MCF"
                        : "Connect Wallet"}
                    </div>
                  </div>
                  <div className="row">
                    <div className="muted">Last Stake</div>
                    <div>
                      {loading
                        ? "..."
                        : walletConnected &&
                          userData.hasStake &&
                          userData.lastStakeTime
                        ? userData.lastStakeTime.toLocaleDateString()
                        : "Never"}
                    </div>
                  </div>
                  <div className="row">
                    <small className="muted">
                      {p.poolType === "locked"
                        ? "🔒 7-day lock period"
                        : "🔓 Instant unstake"}
                    </small>
                  </div>
                  <div className="pool-actions">
                    <button
                      className="btn gold"
                      onClick={() => onStake(p.poolType)}
                      disabled={!walletConnected}
                    >
                      Stake
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => onUnstake(p.poolType)}
                      disabled={!walletConnected || !userData.hasStake}
                    >
                      Unstake
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="row">
                    <div>APR</div>
                    <div className="num">{p.apr}</div>
                  </div>
                  <div className="row">
                    <div className="muted">Rewards</div>
                    <div>$MCF</div>
                  </div>
                  <div className="row">
                    <div className="muted">Status</div>
                    <div>🔒</div>
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        {walletConnected
          ? loading
            ? "Loading your stake data..."
            : "Real-time data from blockchain"
          : "Connect your wallet to see your stakes"}
      </div>
    </section>
  )
}
