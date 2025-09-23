import { useEffect, useRef } from "react";
export default function useInterval(cb, delay){
  const saved = useRef(cb);
  useEffect(()=>{ saved.current = cb; });
  useEffect(()=>{
    if (delay == null) return;
    const id = setInterval(()=> saved.current(), delay);
    return ()=> clearInterval(id);
  }, [delay]);
}
