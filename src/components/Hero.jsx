import React, { useEffect, useState } from "react";

const base = import.meta.env.BASE_URL; // <-- important

export default function Hero(){
  const [i, setI] = useState(0);
  useEffect(()=>{
    const id = setInterval(()=> setI(p => (p+1)%2), 3000);
    return ()=> clearInterval(id);
  },[]);
  return (
    <section className="card hero">
      <img className={i===0 ? "active" : ""} src={`${base}assets/banner1.png`} alt="banner1" />
      <img className={i===1 ? "active" : ""} src={`${base}assets/banner2.png`} alt="banner2" />
    </section>
  );
}
