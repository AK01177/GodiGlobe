import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Globe from 'react-globe.gl'
import { X, Loader2, RefreshCw, ChevronLeft, MapPin, ChevronDown, ChevronUp, Globe as Glb, Clock } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function App() {
  // 1. Globe Data State (Static/Semi-static)
  const [countries, setCountries] = useState([])
  const [majorCountries, setMajorCountries] = useState([])
  const [globePolygons, setGlobePolygons] = useState([])
  const [stats, setStats] = useState({ c: 0, a: 0, s: 0 })

  // 2. Selection State
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [selectedState, setSelectedState] = useState(null)
  const [states, setStates] = useState([])
  const [globeLines, setGlobeLines] = useState([])

  // 3. News State
  const [news, setNews] = useState(null)
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 4. UI State
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false)

  // Initial Data Fetch
  useEffect(() => {
    Promise.all([
      fetch('/countries.json'),
      fetch('/geojson/ne_110m_admin_0_countries.geojson')
        .catch(() => fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')),
      fetch(`${API}/stats`),
      fetch(`${API}/major-countries`)
    ])
      .then(rs => Promise.all(rs.map(r => r.json())))
      .then(([c, pol, stat, maj]) => {
        setCountries(c)
        setGlobePolygons(pol.features.map(f => ({ ...f, isC: true })))
        setStats({ c: c.length, a: stat.total_articles, s: stat.total_states || 0 })
        setMajorCountries(maj.map(m => m.name))
      })
      .catch(console.error)
  }, [])

  // Country Selection Effects (Load states and lines)
  useEffect(() => {
    if (!selectedCountry) {
      setGlobeLines([])
      setStates([])
      setIsDropdownExpanded(false)
      return
    }

    Promise.all([
      fetch('/geojson/ne_50m_admin_1_states_provinces_lines.geojson')
        .catch(() => fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces_lines.geojson')),
      fetch('/states.json')
    ])
      .then(rs => Promise.all(rs.map(r => r.json())))
      .then(([lines, statesData]) => {
        let ln = []
        lines.features.forEach(f => {
          if (f.geometry.type === 'LineString') {
            ln.push(f.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })))
          } else if (f.geometry.type === 'MultiLineString') {
            f.geometry.coordinates.forEach(l => ln.push(l.map(c => ({ lat: c[1], lng: c[0] }))))
          }
        })
        setGlobeLines(ln)
        setStates(statesData[selectedCountry] || [])
      })
  }, [selectedCountry])

  // Fetch News Logic
  const fetchNews = useCallback(async (c, s, isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoadingNews(true)
    }

    try {
      const params = new URLSearchParams(s ? { state: s } : {})
      const res = await fetch(`${API}/news/${encodeURIComponent(c)}?${params}`).then(r => r.json())
      setNews(res)
      
      // If backend is refreshing cache in background, poll again soon
      if (res.status === 'refreshing') {
        setTimeout(() => fetchNews(c, s, true), 4000)
      }
    } finally {
      setIsLoadingNews(false)
      setIsRefreshing(false)
    }
  }, [])

  // Trigger news fetch when selection changes
  useEffect(() => {
    if (selectedCountry) {
      fetchNews(selectedCountry, selectedState)
    } else {
      setNews(null)
    }
  }, [selectedCountry, selectedState, fetchNews])

  // Memoize Globe Points
  const pointsData = useMemo(() => {
    if (!selectedCountry) {
      return countries.map(c => ({ ...c, type: 'c' }))
    }
    
    const countryPoint = countries.find(c => c.name === selectedCountry)
    const csPoints = countryPoint ? [{ ...countryPoint, type: 'cs' }] : []
    const statePoints = states.map(s => ({ ...s, type: 's', sel: selectedState === s.name }))
    
    return [...csPoints, ...statePoints]
  }, [countries, states, selectedCountry, selectedState])

  // Memoize Globe Labels
  const labelsData = useMemo(() => {
    if (!selectedCountry) {
      return countries
        .filter(c => majorCountries.includes(c.name))
        .map(c => ({ ...c, sz: 0.4, clr: 'rgba(255,255,255,0.5)' }))
    }
    
    const countryPoint = countries.find(c => c.name === selectedCountry)
    const csLabels = countryPoint ? [{ ...countryPoint, sz: 0.8, clr: '#60a5fa' }] : []
    const stateLabels = states.map(s => ({
      ...s,
      sz: selectedState === s.name ? 0.7 : 0.4,
      clr: selectedState === s.name ? '#fbbf24' : 'rgba(251,191,36,0.7)'
    }))
    
    return [...csLabels, ...stateLabels]
  }, [countries, states, selectedCountry, selectedState, majorCountries])

  // Globe Event Handlers
  const onPolygonClick = useCallback(p => {
    setSelectedCountry(p.properties.ADMIN)
    setSelectedState(null)
  }, [])

  const onPointClick = useCallback(x => {
    if (x.type === 's') {
      setSelectedState(x.name)
    } else {
      setSelectedCountry(x.name)
      setSelectedState(null)
    }
  }, [selectedCountry])

  const clearSelection = useCallback(() => {
    setSelectedCountry(null)
    setSelectedState(null)
  }, [])

  const clearStateSelection = useCallback(() => {
    setSelectedState(null)
  }, [])

  // Globe Style Callbacks (memoized for performance)
  const getPolygonCapColor = useCallback(() => 'rgba(200,200,200,0.02)', [])
  const getPolygonSideColor = useCallback(() => 'transparent', [])
  const getPolygonStrokeColor = useCallback(() => 'rgba(255,255,255,0.25)', [])
  const getPathColor = useCallback(() => 'rgba(255,255,255,0.08)', [])
  
  const getPointColor = useCallback(x => {
    if (x.type === 's') return x.sel ? '#fbbf24' : 'rgba(251,191,36,0.55)'
    if (x.type === 'cs') return '#60a5fa'
    return 'rgba(255,255,255,0.35)'
  }, [])
  
  const getPointRadius = useCallback(x => {
    if (x.type === 's') return x.sel ? 0.35 : 0.15
    if (x.type === 'cs') return 0.4
    return 0.2
  }, [])

  return (
    <div className="relative w-screen h-screen bg-black text-white flex overflow-hidden">
      {/* 3D Globe Background */}
      <div className="absolute inset-0 z-0">
        <Globe 
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg" 
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png" 
          
          polygonsData={globePolygons} 
          polygonCapColor={getPolygonCapColor} 
          polygonSideColor={getPolygonSideColor} 
          polygonStrokeColor={getPolygonStrokeColor} 
          onPolygonClick={onPolygonClick}
          
          pathsData={globeLines} 
          pathPoints={x => x} 
          pathPointLat={p => p.lat} 
          pathPointLng={p => p.lng} 
          pathColor={getPathColor} 
          
          pointsData={pointsData} 
          pointLat="lat" 
          pointLng="lng" 
          pointColor={getPointColor} 
          pointRadius={getPointRadius} 
          pointAltitude={0.01} 
          onPointClick={onPointClick} 
          
          labelsData={labelsData} 
          labelLat="lat" 
          labelLng="lng" 
          labelText="name" 
          labelSize={x => x.sz || 0.5} 
          labelDotRadius={0} 
          labelColor={x => x.clr} 
          labelAltitude={0.015} 
        />
      </div>

      {/* Header UI */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between pointer-events-none">
        <div>
          <h1 className="text-2xl font-light tracking-[0.2em]">GODIGLOBE</h1>
          <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mt-1">AI News</p>
        </div>
        <div className="flex gap-6 text-xs tracking-widest text-white/50 uppercase pointer-events-auto">
          <div className="flex flex-col items-end">
            <span>Countries</span>
            <span className="text-white text-lg">{stats.c}</span>
          </div>
          <div className="flex flex-col items-end">
            <span>States</span>
            <span className="text-white text-lg">{stats.s}</span>
          </div>
          <div className="flex flex-col items-end">
            <span>Articles</span>
            <span className="text-white text-lg">{stats.a}</span>
          </div>
        </div>
      </div>

      {/* Side Panel UI */}
      {selectedCountry && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-black/40 backdrop-blur-3xl border-l border-white/10 z-20 flex flex-col pointer-events-auto">
          
          {/* Panel Header */}
          <div className="px-6 py-8 border-b border-white/10 bg-gradient-to-b from-white/10 to-transparent">
            
            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 flex">
              <button 
                onClick={() => fetchNews(selectedCountry, selectedState, true)} 
                className="p-2 text-white/50 hover:text-white"
                title="Refresh News"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={clearSelection} 
                className="p-2 text-white/50 hover:text-white"
                title="Close Panel"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Location Title */}
            <div className="mt-2">
              {selectedState && (
                <button 
                  onClick={clearStateSelection} 
                  className="flex text-xs text-blue-400 mb-2 uppercase hover:text-blue-300 transition-colors"
                >
                  <ChevronLeft size={14} /> Back to {selectedCountry}
                </button>
              )}
              <h2 className="text-3xl font-light uppercase flex items-center gap-3">
                <Glb size={28} className="text-blue-500" /> 
                {selectedState || selectedCountry}
              </h2>
            </div>
            
            {/* States Dropdown */}
            {states.length > 1 && !selectedState && (
              <div className="mt-6 relative">
                <button 
                  onClick={() => setIsDropdownExpanded(!isDropdownExpanded)} 
                  className="w-full flex justify-between px-4 py-3 text-xs uppercase bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <span className="flex gap-2"><MapPin size={14} /> {states.length} States</span>
                  {isDropdownExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {isDropdownExpanded && (
                  <div className="absolute top-full mt-2 w-full max-h-64 overflow-y-auto bg-neutral-900/95 p-2 grid grid-cols-2 gap-2 z-30 shadow-2xl border border-white/10">
                    {states.map(s => (
                      <button 
                        key={s.name} 
                        onClick={() => {
                          setSelectedState(s.name)
                          setIsDropdownExpanded(false)
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
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {isLoadingNews ? (
              <div className="flex flex-col items-center justify-center h-full text-white/40">
                <Loader2 className="animate-spin mb-6 text-blue-500" size={40} />
                <p className="text-xs uppercase font-light tracking-widest">Gathering Intelligence</p>
              </div>
            ) : !news?.articles?.length ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <Glb size={48} className="opacity-50 mb-6" />
                <p className="text-sm uppercase text-center tracking-widest">No developments</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {news.articles.map((a) => (
                  <article key={a.id} className="bg-white/5 p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 border border-white/5 hover:border-white/10">
                    <div className="flex justify-between mb-4 items-start">
                      <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded uppercase font-medium">
                        {a.source}
                      </span>
                      <span className="text-[10px] text-white/40 flex items-center gap-1">
                        <Clock size={12} /> 
                        {new Date(a.published_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-base mb-3 text-white/90 hover:text-white line-clamp-3 font-medium">
                      <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
                    </h3>
                    <p className="text-sm text-white/50 line-clamp-4 leading-relaxed">
                      {a.summary}
                    </p>
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
