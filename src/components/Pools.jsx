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
    const fetchAllUserData = async () => {
      if (!walletConnected || !window.solana) return

      setLoading(true)
      try {
        const publicKey = window.solana.publicKey
        const userData = {}

        // Fetch data for both pool types
        const poolTypes = ["flexible", "locked"]

        for (const poolType of poolTypes) {
          try {
            // Derive user stake PDA
            const [userStakePda] = PublicKey.findProgramAddressSync(
              [
                Buffer.from("user"),
                publicKey.toBuffer(),
                Buffer.from(poolType),
              ],
              program.programId
            )

            // Fetch user stake account
            const userStakeAccount = await program.account.userStake.fetch(
              userStakePda
            )

            // Get account data for token decimals
            const accountData = await getAccountData()
            const matchingPool = accountData?.pools?.find((pool) => {
              const accountPoolType = pool.account.poolType
              if (poolType === "flexible") {
                return accountPoolType.flexible !== undefined
              } else if (poolType === "locked") {
                return accountPoolType.locked !== undefined
              }
              return false
            })

            let tokenDecimals = 6
            if (matchingPool) {
              try {
                const { getMint } = await import("@solana/spl-token")
                const mintInfo = await getMint(
                  connection,
                  matchingPool.account.mint
                )
                tokenDecimals = mintInfo.decimals
              } catch (err) {
                console.warn("Failed to fetch token decimals:", err)
              }
            }

            const decimalsMultiplier = Math.pow(10, tokenDecimals)
            userData[poolType] = {
              staked: userStakeAccount.amount.toNumber() / decimalsMultiplier,
              lastStakeTime: new Date(
                userStakeAccount.lastStakeTime.toNumber() * 1000
              ),
              hasStake: true,
            }
          } catch (error) {
            // No stake found for this pool type
            userData[poolType] = {
              staked: 0,
              lastStakeTime: null,
              hasStake: false,
            }
          }
        }

        setUserStakeData(userData)
      } catch (error) {
        console.error("Error fetching user stake data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllUserData()
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
