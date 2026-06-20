import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Globe from 'react-globe.gl'
import { X, Loader2, RefreshCw, ChevronLeft, MapPin, ChevronDown, ChevronUp, Globe as Glb, Clock } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function App() {
  const [d, setD] = useState({ C: [], S: [], glPol: [], glLn: [], selC: null, selS: null, news: null, load: false, ref: false, stats: {c:0,a:0,s:0}, majC: [], exp: false })
  const set = (u) => setD(prev => ({ ...prev, ...u }))
  
  useEffect(() => {
    Promise.all([fetch('/countries.json'), fetch('/geojson/ne_110m_admin_0_countries.geojson').catch(()=>fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')), fetch(`${API}/stats`), fetch(`${API}/major-countries`)])
      .then(rs => Promise.all(rs.map(r => r.json()))).then(([c, pol, stat, maj]) => set({ C: c, glPol: pol.features.map(f => ({...f, isC: true})), stats: {c: c.length, a: stat.total_articles, s: stat.total_states||0}, majC: maj.map(m=>m.name) })).catch(console.error)
  }, [])

  useEffect(() => {
    if (!d.selC) return set({ glLn: [], S: [] })
    Promise.all([fetch('/geojson/ne_50m_admin_1_states_provinces_lines.geojson').catch(()=>fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces_lines.geojson')), fetch('/states.json')])
      .then(rs => Promise.all(rs.map(r=>r.json()))).then(([lines, states]) => {
        let ln = []; lines.features.forEach(f => { if(f.geometry.type==='LineString') ln.push(f.geometry.coordinates.map(c=>({lat:c[1],lng:c[0]}))); else if(f.geometry.type==='MultiLineString') f.geometry.coordinates.forEach(l=>ln.push(l.map(c=>({lat:c[1],lng:c[0]})))) })
        set({ glLn: ln, S: states[d.selC] || [] })
      })
  }, [d.selC])

  const fetchNews = useCallback(async (c, s, ref=false) => {
    set({ [ref?'ref':'load']: true })
    try {
      const res = await (await fetch(`${API}/news/${encodeURIComponent(c)}?${new URLSearchParams(s?{state:s}:{})}`)).json()
      set({ news: res })
      if (res.status === 'refreshing') setTimeout(() => fetchNews(c, s, true), 4000)
    } finally { set({ load: false, ref: false }) }
  }, [])

  useEffect(() => { if(d.selC) fetchNews(d.selC, d.selS); else set({news:null}) }, [d.selC, d.selS, fetchNews])

  const pts = useMemo(() => !d.selC ? d.C.map(c => ({...c, type:'c'})) : [...(d.C.find(c=>c.name===d.selC) ? [{...d.C.find(c=>c.name===d.selC), type:'cs'}] : []), ...d.S.map(s => ({...s, type:'s', sel:d.selS===s.name}))], [d.C, d.S, d.selC, d.selS])
  const lbls = useMemo(() => !d.selC ? d.C.filter(c=>d.majC.includes(c.name)).map(c=>({...c, sz:0.4, clr:'rgba(255,255,255,0.5)'})) : [...(d.C.find(c=>c.name===d.selC) ? [{...d.C.find(c=>c.name===d.selC), sz:0.8, clr:'#60a5fa'}] : []), ...d.S.map(s=>({...s, sz:d.selS===s.name?0.7:0.4, clr:d.selS===s.name?'#fbbf24':'rgba(251,191,36,0.7)'}))], [d.C, d.S, d.selC, d.selS, d.majC])

  const cb = useCallback
  return (
    <div className="relative w-screen h-screen bg-black text-white flex overflow-hidden">
      <div className="absolute inset-0 z-0"><Globe globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg" backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png" polygonsData={d.glPol} polygonCapColor={cb(()=>'rgba(200,200,200,0.02)',[])} polygonSideColor={cb(()=>'transparent',[])} polygonStrokeColor={cb(()=>'rgba(255,255,255,0.25)',[])} pathsData={d.glLn} pathPoints={x=>x} pathPointLat={p=>p.lat} pathPointLng={p=>p.lng} pathColor={cb(()=>'rgba(255,255,255,0.08)',[])} pointsData={pts} pointLat="lat" pointLng="lng" pointColor={cb(x=>x.type==='s'?(x.sel?'#fbbf24':'rgba(251,191,36,0.55)'):(x.type==='cs'?'#60a5fa':'rgba(255,255,255,0.35)'),[])} pointRadius={cb(x=>x.type==='s'?(x.sel?0.35:0.15):(x.type==='cs'?0.4:0.2),[])} pointAltitude={0.01} onPointClick={cb(x=>set({selS: x.type==='s'?x.name:null, selC: x.type!=='s'?x.name:d.selC}),[d.selC])} labelsData={lbls} labelLat="lat" labelLng="lng" labelText="name" labelSize={x=>x.sz||0.5} labelDotRadius={0} labelColor={x=>x.clr} labelAltitude={0.015} /></div>
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between pointer-events-none">
        <div><h1 className="text-2xl font-light tracking-[0.2em]">GODIGLOBE</h1><p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mt-1">AI News</p></div>
        <div className="flex gap-6 text-xs tracking-widest text-white/50 uppercase pointer-events-auto">{['Countries','States','Articles'].map((x,i)=><div key={x} className="flex flex-col items-end"><span>{x}</span><span className="text-white text-lg">{[d.stats.c, d.stats.s, d.stats.a][i]}</span></div>)}</div>
      </div>
      {d.selC && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-black/40 backdrop-blur-3xl border-l border-white/10 z-20 flex flex-col pointer-events-auto">
          <div className="px-6 py-8 border-b border-white/10 bg-gradient-to-b from-white/10 to-transparent">
            <div className="absolute top-4 right-4 flex"><button onClick={()=>fetchNews(d.selC, d.selS, true)} className="p-2 text-white/50 hover:text-white"><RefreshCw size={18} className={d.ref?'animate-spin':''}/></button><button onClick={()=>set({selC:null,selS:null})} className="p-2 text-white/50 hover:text-white"><X size={18}/></button></div>
            <div className="mt-2">{d.selS && <button onClick={()=>set({selS:null})} className="flex text-xs text-blue-400 mb-2 uppercase"><ChevronLeft size={14}/> Back to {d.selC}</button>}<h2 className="text-3xl font-light uppercase flex items-center gap-3"><Glb size={28} className="text-blue-500" /> {d.selS || d.selC}</h2></div>
            {d.S.length > 1 && !d.selS && (<div className="mt-6 relative"><button onClick={()=>set({exp:!d.exp})} className="w-full flex justify-between px-4 py-3 text-xs uppercase bg-white/5 border border-white/10 hover:bg-white/10"><span className="flex gap-2"><MapPin size={14}/> {d.S.length} States</span>{d.exp?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>{d.exp && <div className="absolute top-full mt-2 w-full max-h-64 overflow-y-auto bg-neutral-900/95 p-2 grid grid-cols-2 gap-2 z-30">{d.S.map(s=><button key={s.name} onClick={()=>set({selS:s.name,exp:false})} className="text-xs p-2 text-left hover:bg-white/5">{s.name}</button>)}</div>}</div>)}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {d.load ? <div className="flex flex-col items-center justify-center h-full text-white/40"><Loader2 className="animate-spin mb-6 text-blue-500" size={40}/><p className="text-xs uppercase font-light">Gathering Intelligence</p></div> : !d.news?.articles?.length ? <div className="flex flex-col items-center justify-center h-full text-white/30"><Glb size={48} className="opacity-50 mb-6"/><p className="text-sm uppercase text-center">No developments</p></div> : <div className="flex flex-col gap-6">{d.news.articles.map((a, i) => <article key={a.id} className="bg-white/5 p-6 rounded-2xl hover:-translate-y-1 transition-all"><div className="flex justify-between mb-4"><span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded uppercase">{a.source}</span><span className="text-[10px] text-white/40 flex items-center gap-1"><Clock size={12}/> {new Date(a.published_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div><h3 className="text-base mb-3 text-white/90 hover:text-white line-clamp-3"><a href={a.url} target="_blank">{a.title}</a></h3><p className="text-sm text-white/50 line-clamp-4">{a.summary}</p></article>)}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
