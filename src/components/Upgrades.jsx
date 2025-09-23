import React from "react";

const NAMES = [
  {name:"Farm", desc:"+1 per tap each level"},
  {name:"get hired", desc:"Enable auto; extra levels boost auto yield"},
  {name:"Golden Deep Fryer", desc:"+3 per tap each level"},
  {name:"$FRIES Money Printer🍟", desc:"+10 per tap each level"},
];

export default function Upgrades({points, levels, nextCost, canBuy, buy}){
  return (
    <>
      {NAMES.map((u, i)=> {
        const lvl = levels[i] || 0;
        const cost = nextCost(i);
        const afford = canBuy(i);

        return (
          <div key={i} className="move">
            <div>
              <div className="name">{u.name}</div>
              <div className="desc">
                {u.desc} {lvl > 0 ? `(Level ${lvl})` : ""}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
              <button
                className="btn gold sm"
                onClick={()=>buy(i)}
                disabled={!afford}
                style={!afford ? {opacity:.6, cursor:"not-allowed"} : {}}
              >
                Upgrade
              </button>
              <small style={{fontSize:"11px",color:"var(--muted)",marginTop:"3px"}}>
                Cost: {cost.toLocaleString()}
              </small>
            </div>
          </div>
        );
      })}
    </>
  );
}
