import React from "react";

const pools = [
  // Row 1
  { title: "$Payroll", sub: "Stake $MCF for clean $SOL", apr: "589.41%", enabled: false, icon: "/assets/pool-burgers.png" },
  { title: "$MCF Retirement Pool", sub: "Automatic Farming", apy: "29,140.46%", enabled: true, icon: "/assets/pool-auto.png",
    staked: "1,234.56", earned: "0.000", fee: "" },
  { title: "$FRIES", sub: "Coming soon", apr: "777.77%", enabled: false, icon: "/assets/pool-milkshake.png" },

  // Row 2
  { title: "USD1 Reward Pool", sub: "Coming soon", apr: "1,234.56%", enabled: false, icon: "/assets/pool-1.png" },
  { title: "$BURGER", sub: "Coming soon", apr: "4,206.90%", enabled: false, icon: "/assets/pool-milkshake.png" },
  { title: "$MILKSHAKE", sub: "Coming soon", apr: "9,999.99%", enabled: false, icon: "/assets/pool-2.png" },
];

export default function Pools({ onStake }) {
  return (
    <section className="pools card" style={{ marginTop: 18 }}>
      <h2 style={{ marginBottom: 10 }}>Pools</h2>

      <div className="pool-grid">
        {pools.map((p, idx) => (
          <article key={idx} className={`pool ${p.enabled ? "enabled" : "disabled"}`}>
            <div className="pool-hd">
              <img src={p.icon} className="pool-icon" alt={p.title} />
              <div>
                <div className="pool-title">{p.title}</div>
                <div className="pool-sub">{p.sub}</div>
              </div>
            </div>

            {p.enabled ? (
              <>
                <div className="row"><div>APY</div><div className="num">{p.apy}</div></div>
                <div className="row"><div className="muted">Recent profit</div><div>0</div></div>
                <div className="row"><div className="muted">$MCF STAKED (COMPOUNDING)</div><div>{p.staked}</div></div>
                <div className="row"><div className="muted">$MCF EARNED</div><div>{p.earned}</div></div>
                <div className="row"><small className="muted">{p.fee}</small></div>
                <div className="pool-actions">
                  <button className="btn gold" onClick={onStake}>Stake</button>
                  <button className="btn ghost">Unstake</button>
                </div>
              </>
            ) : (
              <>
                <div className="row"><div>APR</div><div className="num">{p.apr}</div></div>
                <div className="row"><div className="muted">Rewards</div><div>$MCF</div></div>
                <div className="row"><div className="muted">Status</div><div>🔒</div></div>
              </>
            )}
          </article>
        ))}
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        
      </div>
    </section>
  );
}
