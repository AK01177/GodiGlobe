import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Globe from 'react-globe.gl'
import { X, Loader2, RefreshCw, ChevronLeft, MapPin, ChevronDown, ChevronUp, Globe as Glb, Clock } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Pure style callbacks — defined outside so they're never recreated
const polyCapColor = () => 'rgba(200,200,200,0.02)'
const polySideColor = () => 'transparent'
const polyStroke = () => 'rgba(255,255,255,0.25)'
const pathColor = () => 'rgba(255,255,255,0.08)'
const pointColor = x => x.type === 's' ? (x.sel ? '#fbbf24' : 'rgba(251,191,36,0.55)') : x.type === 'cs' ? '#60a5fa' : 'rgba(255,255,255,0.35)'
const pointRadius = x => x.type === 's' ? (x.sel ? 0.35 : 0.15) : x.type === 'cs' ? 0.4 : 0.2
const pathPoints = x => x
const pathPointLat = p => p.lat
const pathPointLng = p => p.lng
const labelSize = x => x.sz || 0.5
const labelColor = x => x.clr

let cachedStatesGeo = null;

async function loadJson(url, fallbackUrl) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Status not ok')

    // Vite returns 200 OK with index.html for missing files. We must check content type.
    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Response is not JSON')
    }

    return await res.json()
  } catch (err) {
    if (fallbackUrl) {
      const fallback = await fetch(fallbackUrl)
      if (!fallback.ok) throw new Error(`Failed to load ${url}`)
      return fallback.json()
    }
    throw new Error(`Failed to load ${url}`)
  }
}

export default function App() {
  const [countries, setCountries] = useState([])
  const [majorCountries, setMajorCountries] = useState([])
  const [polygons, setPolygons] = useState([])
  const [stats, setStats] = useState({ c: 0, a: 0, s: 0 })
  const [selected, setSelected] = useState({ country: null, state: null })
  const [states, setStates] = useState([])
  const [lines, setLines] = useState([])
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(null) // null | 'loading' | 'refreshing'
  const [error, setError] = useState(null)
  const [showStates, setShowStates] = useState(false)

  // Initial data load
  useEffect(() => {
    const geojsonFallback = 'https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson'

    Promise.all([
      fetch(`${API}/countries`).then(r => r.ok ? r.json() : []),
      loadJson('/geojson/ne_110m_admin_0_countries.geojson', geojsonFallback),
      fetch(`${API}/stats`).then(r => r.ok ? r.json() : { total_articles: 0, total_states: 0 }),
      fetch(`${API}/major-countries`).then(r => r.ok ? r.json() : []),
    ])
      .then(([c, pol, stat, maj]) => {
        setCountries(c)
        setPolygons(pol.features.map(f => ({ ...f, isC: true })))
        setStats({ c: c.length, a: stat.total_articles ?? 0, s: stat.total_states ?? 0 })
        setMajorCountries(maj.map(m => m.name))
        setError(null)
      })
      .catch(err => {
        console.error(err)
        setError('Unable to load map data. Check your connection and try again.')
      })
  }, [])

  // Load state boundaries when a country is picked
  useEffect(() => {
    if (!selected.country) {
      setLines([])
      setStates([])
      setShowStates(false)
      return
    }
    const statesGeoFallback = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces_lines.geojson'

    const fetchGeo = cachedStatesGeo
      ? Promise.resolve(cachedStatesGeo)
      : loadJson('/geojson/ne_50m_admin_1_states_provinces_lines.geojson', statesGeoFallback).then(data => {
        cachedStatesGeo = data;
        return data;
      })

    Promise.all([
      fetchGeo,
      fetch(`${API}/states/${encodeURIComponent(selected.country)}`).then(r => r.ok ? r.json() : { states: [] }),
    ])
      .then(([geo, statesData]) => {
        const ln = []
        geo.features.forEach(f => {
          // Filter to only process and render boundaries for the selected country
          if (f.properties?.admin !== selected.country) return;

          if (f.geometry.type === 'LineString')
            ln.push(f.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })))
          else if (f.geometry.type === 'MultiLineString')
            f.geometry.coordinates.forEach(l => ln.push(l.map(c => ({ lat: c[1], lng: c[0] }))))
        })
        setLines(ln)
        setStates(statesData.states || [])
      })
      .catch(err => console.error(err))
  }, [selected.country])

  const fetchRequestId = useRef(0)

  const fetchNews = useCallback(async (country, state, refresh = false) => {
    const reqId = ++fetchRequestId.current
    setLoading(refresh ? 'refreshing' : 'loading')
    try {
      const qs = state ? `?state=${encodeURIComponent(state)}` : ''
      const res = await fetch(`${API}/news/${encodeURIComponent(country)}${qs}`)
      
      if (reqId !== fetchRequestId.current) return
      
      if (!res.ok) {
        const detail = res.status === 404 ? 'Country not found.' : 'Failed to load news.'
        setNews({ articles: [] })
        setError(detail)
        return
      }
      const data = await res.json()
      
      if (reqId !== fetchRequestId.current) return
      
      setNews(data)
      setError(null)
      if (data.status === 'refreshing') setTimeout(() => {
        if (reqId === fetchRequestId.current) fetchNews(country, state, true)
      }, 4000)
    } catch {
      if (reqId !== fetchRequestId.current) return
      setNews({ articles: [] })
      setError('Could not reach the news API. Is the backend running?')
    } finally {
      if (reqId === fetchRequestId.current) setLoading(null)
    }
  }, [])

  useEffect(() => {
    if (selected.country) fetchNews(selected.country, selected.state)
    else setNews(null)
  }, [selected.country, selected.state, fetchNews])

  const points = useMemo(() => {
    if (!selected.country) return countries.map(c => ({ ...c, type: 'c' }))
    const anchor = countries.find(c => c.name === selected.country)
    return [
      ...(anchor ? [{ ...anchor, type: 'cs' }] : []),
      ...states.map(s => ({ ...s, type: 's', sel: selected.state === s.name })),
    ]
  }, [countries, states, selected])

  const labels = useMemo(() => {
    if (!selected.country)
      return countries
        .filter(c => majorCountries.includes(c.name))
        .map(c => ({ ...c, sz: 0.4, clr: 'rgba(255,255,255,0.5)' }))
    const anchor = countries.find(c => c.name === selected.country)
    return [
      ...(anchor ? [{ ...anchor, sz: 0.8, clr: '#60a5fa' }] : []),
      ...states.map(s => ({
        ...s,
        sz: selected.state === s.name ? 0.7 : 0.4,
        clr: selected.state === s.name ? '#fbbf24' : 'rgba(251,191,36,0.7)',
      })),
    ]
  }, [countries, states, selected, majorCountries])

  const selectCountry = useCallback(name => setSelected({ country: name, state: null }), [])
  const clearAll = useCallback(() => setSelected({ country: null, state: null }), [])
  const clearState = useCallback(() => setSelected(p => ({ ...p, state: null })), [])

  const handlePolygonClick = useCallback(p => {
    const iso2 = p.properties.ISO_A2;
    const iso3 = p.properties.ISO_A3 || p.properties.ADM0_A3;
    const name = p.properties.ADMIN;
    
    const country = countries.find(c => 
      (iso2 && iso2 !== '-99' && c.iso2 === iso2) || 
      (iso3 && iso3 !== '-99' && c.iso3 === iso3) || 
      c.name === name
    );

    selectCountry(country ? country.name : name);
  }, [selectCountry, countries])
  const handlePointClick = useCallback(x => x.type === 's'
    ? setSelected(p => ({ ...p, state: x.name }))
    : selectCountry(x.name), [selectCountry])

  return (
    <div className="relative w-screen h-screen bg-black text-white flex overflow-hidden">

      {/* Globe */}
      <div className="absolute inset-0 z-0">
        <Globe
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          polygonsData={polygons}
          polygonCapColor={polyCapColor}
          polygonSideColor={polySideColor}
          polygonStrokeColor={polyStroke}
          onPolygonClick={handlePolygonClick}
          pathsData={lines}
          pathPoints={pathPoints}
          pathPointLat={pathPointLat}
          pathPointLng={pathPointLng}
          pathColor={pathColor}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={pointColor}
          pointRadius={pointRadius}
          pointAltitude={0.01}
          onPointClick={handlePointClick}
          labelsData={labels}
          labelLat="lat"
          labelLng="lng"
          labelText="name"
          labelSize={labelSize}
          labelDotRadius={0}
          labelColor={labelColor}
          labelAltitude={0.015}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between pointer-events-none">
        <div>
          <h1 className="text-2xl font-light tracking-[0.2em]">GODIGLOBE</h1>
          <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mt-1">World News</p>
        </div>
        <div className="flex gap-6 text-xs tracking-widest text-white/50 uppercase pointer-events-auto">
          {[['Countries', stats.c], ['States', stats.s], ['Articles', stats.a]].map(([label, val]) => (
            <div key={label} className="flex flex-col items-end">
              <span>{label}</span>
              <span className="text-white text-lg">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {error && !selected.country && (
        <div className="absolute bottom-6 left-6 z-20 max-w-sm px-4 py-3 text-xs uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-300">
          {error}
        </div>
      )}

      {/* Side Panel */}
      {selected.country && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-black/40 backdrop-blur-3xl border-l border-white/10 z-20 flex flex-col pointer-events-auto animate-slide-in">

          {/* Panel Header */}
          <div className="px-6 py-8 border-b border-white/10 bg-gradient-to-b from-white/10 to-transparent">
            <div className="absolute top-4 right-4 flex">
              <button
                onClick={() => fetchNews(selected.country, selected.state, true)}
                className="p-2 text-white/50 hover:text-white"
                title="Refresh"
              >
                <RefreshCw size={18} className={loading === 'refreshing' ? 'animate-spin' : ''} />
              </button>
              <button onClick={clearAll} className="p-2 text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-2">
              {selected.state && (
                <button onClick={clearState} className="flex text-xs text-blue-400 mb-2 uppercase hover:text-blue-300 transition-colors">
                  <ChevronLeft size={14} /> Back to {selected.country}
                </button>
              )}
              <h2 className="text-3xl font-light uppercase flex items-center gap-3">
                <Glb size={28} className="text-blue-500" />
                {selected.state || selected.country}
              </h2>
            </div>

            {states.length > 1 && !selected.state && (
              <div className="mt-6 relative">
                <button
                  onClick={() => setShowStates(v => !v)}
                  className="w-full flex justify-between px-4 py-3 text-xs uppercase bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <span className="flex gap-2"><MapPin size={14} /> {states.length} States</span>
                  {showStates ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showStates && (
                  <div className="absolute top-full mt-2 w-full max-h-64 overflow-y-auto bg-neutral-900/95 p-2 grid grid-cols-2 gap-2 z-30 shadow-2xl border border-white/10">
                    {states.map(s => (
                      <button
                        key={s.name}
                        onClick={() => {
                          setSelected(p => ({ ...p, state: s.name }))
                          setShowStates(false)
                        }}
                        className="text-xs p-2 text-left hover:bg-white/10 rounded transition-colors"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* News List */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {error && (
              <p className="mb-4 text-xs uppercase tracking-wider text-red-300/90">{error}</p>
            )}
            {loading === 'loading' ? (
              <div className="flex flex-col items-center justify-center h-full text-white/40">
                <Loader2 className="animate-spin mb-6 text-blue-500" size={40} />
                <p className="text-xs uppercase tracking-widest font-light">Gathering Intelligence</p>
              </div>
            ) : !news?.articles?.length ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <Glb size={48} className="opacity-50 mb-6" />
                <p className="text-sm uppercase tracking-widest">No developments</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {news.articles.map(a => (
                  <article key={a.id} className="bg-white/5 p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 border border-white/5 hover:border-white/10">
                    <div className="flex justify-between mb-4 items-start">
                      <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded uppercase font-medium">{a.source}</span>
                      <span className="text-[10px] text-white/40 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(a.published_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-base mb-3 text-white/90 hover:text-white line-clamp-3 font-medium">
                      <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
                    </h3>
                    <p className="text-sm text-white/50 line-clamp-4 leading-relaxed">{a.summary}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}