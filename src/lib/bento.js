export const DEFAULT_ORDER = ['hero','stats','focus','habits','cal','courses']
const KEY='bento-order-v1'
const STORAGE_PREFIX='shawn-'

export function getBentoOrder(){
  try{
    const raw=localStorage.getItem(KEY)
    if(!raw) return [...DEFAULT_ORDER]
    const parsed=JSON.parse(raw)
    if(!Array.isArray(parsed)) return [...DEFAULT_ORDER]
    const seen=new Set()
    const filtered=[]
    for(const id of parsed){ if(!DEFAULT_ORDER.includes(id)) continue; if(seen.has(id)) continue; seen.add(id); filtered.push(id) }
    for(const id of DEFAULT_ORDER) if(!seen.has(id)) filtered.push(id)
    return filtered.slice(0, DEFAULT_ORDER.length)
  }catch{ return [...DEFAULT_ORDER] }
}
export function saveBentoOrder(order){
  try{
    const seen=new Set()
    const uniq=[]
    for(const id of order){ if(seen.has(id)) continue; if(!DEFAULT_ORDER.includes(id)) continue; seen.add(id); uniq.push(id) }
    for(const id of DEFAULT_ORDER) if(!seen.has(id)) uniq.push(id)
    const next = uniq.slice(0, DEFAULT_ORDER.length)
    const serialized = JSON.stringify(next)
    // size guard: bento order is tiny, but respect quota
    if (serialized.length > 1000) return
    localStorage.setItem(KEY, serialized)
  }catch{/* ignore */}
}

export function clearBentoOrder(){
  try{ localStorage.removeItem(KEY) }catch{/* ignore */}
}

export function clearAllAppStorage(){
  try{
    const keys=[]
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)
      if(k && (k.startsWith(STORAGE_PREFIX) || k===KEY)) keys.push(k)
    }
    for(const k of keys) localStorage.removeItem(k)
  }catch{/* ignore */}
}
