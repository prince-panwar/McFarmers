import React, { useEffect, useState } from "react";

export default function StatsRef(){
  const [tvl, setTvl] = useState(0);
  const [wallet, setWallet] = useState("");
  const [ref, setRef] = useState("");

  // fake TVL counter animation
  useEffect(()=>{
    let v=0, target=300000, step=6000;
    const id = setInterval(()=>{
      v+=step; if (v>=target){ v=target; clearInterval(id); }
      setTvl(v);
    }, 20);
    return ()=> clearInterval(id);
  },[]);

  // fake connect
  function connect(){
    const fake = "SoL" + Math.random().toString(36).slice(2,10).toUpperCase();
    setWallet(fake);
    setRef(`${window.location.origin}/?ref=${fake}`);
  }

  function copyRef(){
    navigator.clipboard?.writeText(ref);
  }

  return (
    <aside className="card">
      <h2>McFarmerz — Get hired today!</h2>

      {/* 1. Introduction text */}
      <p className="small" style={{marginTop:"6px", lineHeight:"1.4em"}}>
        the first degen APY staking protocol to take over the trenches. <br/>
        DeFi moves in cycles, and we are here to capitalize on that. <br/>
        Ready to convert all sidelined liquidity into the next DeFi surge.
      </p>

      {/* KPIs */}
      <div className="kpis" style={{marginTop:14}}>
        <div className="kpi"><div className="label">TVL</div><div className="value">~${tvl.toLocaleString()}</div></div>
        <div className="kpi"><div className="label">Your Wallet</div><div className="value">{wallet || "Disconnected"}</div></div>
        <div className="kpi"><div className="label">Network</div><div className="value">SOL</div></div>
      </div>

      {/* 2. Buttons */}
      <div style={{display:"flex", gap:10, marginTop:16, flexWrap:"wrap"}}>
        <button className="btn primary" onClick={connect}>{wallet ? "Connected" : "Connect Wallet"}</button>
        <button className="btn gold">Buy $MCF</button>
        <button className="btn ghost" disabled style={{opacity:.5, cursor:"not-allowed"}}>Buy $FRIES🍟</button>
      </div>

      <hr style={{opacity:.2, margin:"16px 0"}}/>

      {/* 3. Referral explanation */}
      <h3 style={{margin:"0 0 6px"}}>BECOME A MANAGER</h3>
      <p className="small" style={{marginTop:0}}>
        Recruit using your link for more liquidity and bigger bonuses!
      </p>

      <div style={{display:"grid", gridTemplateColumns:"1fr auto", gap:10}}>
        <input
          type="text"
          placeholder="Your referral link"
          readOnly
          value={ref || "Connect wallet to generate ref"}
        />
        <button className="btn ghost" onClick={copyRef} disabled={!ref}>Copy</button>
      </div>
    </aside>
  );
}
