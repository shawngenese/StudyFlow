export const DEFAULT_ORDER = ['hero','stats','focus','habits','cal','courses']
const KEY='bento-order-v1'
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
    localStorage.setItem(KEY, JSON.stringify(uniq.slice(0, DEFAULT_ORDER.length)))
  }catch{/* ignore */}
}
