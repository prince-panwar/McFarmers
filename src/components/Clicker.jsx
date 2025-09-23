import React, { useRef } from "react";
import useLocalStorage from "../lib/useLocalStorage.js";
import useInterval from "../lib/useInterval.js";
import Upgrades from "./Upgrades.jsx";

// ── Upgrade design ──────────────────────────────────────────────
// id: 0 Farm                → +1 per tap per level (cost 50, ×1.6)
// id: 1 get hired           → enables auto; each extra level +20% auto yield (cost 300, ×1.8)
// id: 2 Golden Deep Fryer   → +3 per tap per level (cost 1200, ×1.7)
// id: 3 $FRIES MoneyPrinter → +10 per tap per level (cost 20000, ×1.75)
const UPG = [
  { base: 50,    mult: 1.6,  addTap: 1,   autoBonus: 0 },
  { base: 800,   mult: 2.0,  addTap: 0,   autoBonus: 0.3 }, // 0.2 = +20% per extra level
  { base: 1200,  mult: 1.7,  addTap: 3,   autoBonus: 0 },
  { base: 20000, mult: 1.75, addTap: 10,  autoBonus: 0 },
];

export default function Clicker(){
  const stageRef = useRef(null);

  // core state
  const [points, setPoints]         = useLocalStorage("mc.points", 0);
  const [perTap, setPerTap]         = useLocalStorage("mc.perTap", 1);
  const [levels, setLevels]         = useLocalStorage("mc.levels", [0,0,0,0]); // 4 upgrades
  const [autoOn, setAutoOn]         = useLocalStorage("mc.auto", false);

  // derive current auto multiplier from level of upgrade #1
  const autoLevel = levels[1] || 0; // 0 = off
  const autoEnabled = autoLevel > 0 || autoOn; // keep backward compat with old flag
  const autoYieldMultiplier = autoLevel > 0 ? (0.6 + 0.3 * (autoLevel - 1)) : 0; // base 0.5x, +20% each extra level

  // run auto farming
  useInterval(()=>{
    if (!autoEnabled) return;
    // auto yields a fraction of current perTap, rounded at least 1
    const gain = Math.max(1, Math.floor(perTap * autoYieldMultiplier));
    setPoints(p => p + gain);
    spawnFries(stageRef.current, null, 1 + Math.min(6, Math.floor(autoLevel/1)));
  }, autoEnabled ? 700 : null);

  // click action
  function clickRonnie(e){
    setPoints(p => p + perTap);
    spawnFries(stageRef.current, e, 1 + Math.min(4, Math.floor(perTap/5)));
  }

  // compute next cost for an upgrade based on level
  function nextCost(id){
    const { base, mult } = UPG[id];
    const lvl = levels[id] || 0;
    return Math.floor(base * Math.pow(mult, lvl));
  }

  // can buy?
  const canBuy = (id) => points >= nextCost(id);

  // buy/level up an upgrade
  function buy(id){
    const cost = nextCost(id);
    if (points < cost) return;

    setPoints(p => p - cost);

    const newLvls = [...levels];
    newLvls[id] = (newLvls[id] || 0) + 1;
    setLevels(newLvls);

    // apply effects
    if (UPG[id].addTap) {
      setPerTap(t => t + UPG[id].addTap);
    }
    if (id === 1) {
      // get hired → turn auto on; extra levels handled by autoYieldMultiplier
      setAutoOn(true);
    }
  }

  return (
    <section className="card">
      <h2>Fry Station</h2>

      <div className="kpis">
        <div className="kpi"><div className="label">Per Cook</div><div className="value">{perTap}</div></div>
        <div className="kpi"><div className="label">Auto</div><div className="value">{autoEnabled ? `ON ×${autoYieldMultiplier.toFixed(1)}` : "OFF"}</div></div>
        <div className="kpi"><div className="label">$FRIES🍟</div><div className="value">{points.toLocaleString()}</div></div>
      </div>

      <div className="panel" style={{marginTop:12}}>
        <div className="stage" ref={stageRef}>
          <img
            className="ronnie pulse"
            src="/assets/ronnie.png"
            alt="Lil Ronnie"
            onClick={clickRonnie}
          />
        </div>

        <aside className="sidebar">
          <div className="small">Earn points and level up upgrades for bigger yield.</div>
          <Upgrades
            points={points}
            levels={levels}
            nextCost={nextCost}
            canBuy={canBuy}
            buy={buy}
          />
        </aside>
      </div>
    </section>
  );
}

// fries particles (🍟)
function spawnFries(stage, evt, count = 1){
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const baseX = evt?.clientX ?? (rect.left + rect.width/2);
  const baseY = evt?.clientY ?? (rect.top + rect.height*0.65);
  for (let i=0;i<count;i++){
    const span = document.createElement("span");
    span.className = "fries";
    span.textContent = Math.random()<0.2 ? "🍔" : (Math.random()<0.5 ? "🥤" : "🍟");
    const jitterX = baseX - rect.left - 10 + (Math.random()*30-15);
    const jitterY = baseY - rect.top - 10 + (Math.random()*16-8);
    span.style.left = jitterX + "px";
    span.style.top  = jitterY + "px";
    stage.appendChild(span);
    setTimeout(()=> span.remove(), 1000);
  }

}
