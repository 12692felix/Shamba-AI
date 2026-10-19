import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

interface NDVIStats {
  mean: number;
  min: number;
  max: number;
  std_dev: number;
  valid_percentage: number;
}

interface CountyData {
  name: string;
  center: [number, number];
  bounds: [[number, number], [number, number], [number, number], [number, number]];
  available_dates: string[];
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  
  const [counties, setCounties] = useState<CountyData[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string>("Bungoma");
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  const [stats, setStats] = useState<NDVIStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [opacity, setOpacity] = useState<number>(0.8);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(false);

  // 1. Fetch available counties on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/v1/counties')
      .then((res) => res.json())
      .then((data) => {
        setCounties(data);
      })
      .catch((err) => console.error("Failed to load counties:", err));
  }, []);

  const activeCounty = counties.find(c => c.name === selectedCounty);
  const hasData = activeCounty && activeCounty.available_dates.length > 0;

  // 2. Set default date when county changes
  useEffect(() => {
    if (activeCounty && activeCounty.available_dates.length > 0) {
      setSelectedDate(activeCounty.available_dates[0]); 
    } else {
      setSelectedDate("");
      setStats(null);
    }
  }, [selectedCounty, activeCounty]);

  // 3. Fetch statistics when county or date changes
  useEffect(() => {
    if (!selectedCounty || !selectedDate || !hasData) return;
    
    setIsLoading(true);
    setStatsError(null);
    
    fetch(`http://localhost:8000/api/v1/ndvi-statistics?county=${encodeURIComponent(selectedCounty)}&date=${encodeURIComponent(selectedDate)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to load stats");
        }
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setStatsError(err.message);
        setStats(null);
        setIsLoading(false);
      });
  }, [selectedCounty, selectedDate, hasData]);

  // 4. Initialize Map
  useEffect(() => {
    if (map.current) return; 

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', 
      center: [34.575, 0.575], 
      zoom: 11.5,
    });
  }, []);

  // 5. Update Map (Camera + Layers)
  useEffect(() => {
    if (!map.current) return;

    const updateMap = () => {
      if (!map.current) return;

      // Handle Camera FlyTo
      if (selectedCounty === "Western Kenya") {
        map.current.flyTo({ center: [34.4, 0.3], zoom: 7.5, essential: true });
      } else if (activeCounty) {
        map.current.flyTo({ center: activeCounty.center, zoom: 11.5, essential: true });
      }

      // Clean up existing layers
      ['ndvi-layer', 'anomaly-layer'].forEach(id => {
        if (map.current?.getLayer(id)) map.current.removeLayer(id);
      });
      ['ndvi-raster', 'anomaly-raster'].forEach(id => {
        if (map.current?.getSource(id)) map.current.removeSource(id);
      });

      // Add new layers if data exists
      if (hasData && activeCounty && selectedDate) {
        const layers = map.current.getStyle().layers;
        let firstSymbolId: string | undefined;
        if (layers) {
          for (const layer of layers) {
            if (layer.type === 'symbol') { firstSymbolId = layer.id; break; }
          }
        }

        map.current.addSource('ndvi-raster', {
          type: 'image',
          url: `http://localhost:8000/api/v1/ndvi-image?county=${encodeURIComponent(selectedCounty)}&date=${encodeURIComponent(selectedDate)}`,
          coordinates: activeCounty.bounds
        });

        map.current.addLayer({
          id: 'ndvi-layer',
          type: 'raster',
          source: 'ndvi-raster',
          paint: { 'raster-opacity': opacity }
        }, firstSymbolId);

        if (activeCounty.available_dates.length >= 2) {
          map.current.addSource('anomaly-raster', {
            type: 'image',
            url: `http://localhost:8000/api/v1/ndvi-anomaly?county=${encodeURIComponent(selectedCounty)}`,
            coordinates: activeCounty.bounds
          });

          map.current.addLayer({
            id: 'anomaly-layer',
            type: 'raster',
            source: 'anomaly-raster',
            paint: { 'raster-opacity': showAnomalies ? 1 : 0 }
          }, firstSymbolId);
        }
      }
    };

    if (map.current.isStyleLoaded()) {
      updateMap();
    } else {
      map.current.once('load', updateMap);
    }
  }, [selectedCounty, selectedDate, activeCounty, hasData]);

  // Handle opacity
  useEffect(() => {
    if (map.current && map.current.getLayer('ndvi-layer')) {
      map.current.setPaintProperty('ndvi-layer', 'raster-opacity', opacity);
    }
  }, [opacity]);

  // Handle anomaly toggle
  useEffect(() => {
    if (map.current && map.current.getLayer('anomaly-layer')) {
      map.current.setPaintProperty('anomaly-layer', 'raster-opacity', showAnomalies ? 1 : 0);
    }
  }, [showAnomalies]);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white font-sans">
      <header className="bg-green-900 p-4 shadow-md flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">SHAMBA AI</h1>
          <p className="text-sm text-green-200">See Your Fields. Understand Your Crops.</p>
        </div>
        
        <div className="flex items-center gap-6">
          {/* County Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-green-200">County:</label>
            <select 
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="bg-green-800 text-white text-sm px-4 py-2 rounded border border-green-700 focus:outline-none focus:border-green-500 cursor-pointer font-semibold"
            >
              <option value="Western Kenya">Western Kenya (Overview)</option>
              {counties.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-green-200">Date:</label>
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={!hasData}
              className="bg-green-800 text-white text-sm px-4 py-2 rounded border border-green-700 focus:outline-none focus:border-green-500 cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasData ? (
                activeCounty?.available_dates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))
              ) : (
                <option value="">No dates available</option>
              )}
            </select>
          </div>

          {/* Anomaly Toggle */}
          <label className={`flex items-center gap-2 cursor-pointer bg-gray-800 px-4 py-2 rounded border border-gray-700 transition ${!hasData || activeCounty?.available_dates.length! < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}>
            <input 
              type="checkbox" 
              checked={showAnomalies}
              onChange={(e) => setShowAnomalies(e.target.checked)}
              disabled={!hasData || activeCounty?.available_dates.length! < 2}
              className="w-4 h-4 accent-red-500 cursor-pointer"
            />
            <span className="text-sm font-bold text-red-400">Anomalies</span>
          </label>
        </div>
      </header>

      <main className="flex-grow relative">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        
        {/* Statistics Sidebar */}
        <div className="absolute top-6 left-6 bg-gray-800 p-5 rounded-lg shadow-xl opacity-95 border border-gray-700 w-72">
          <h2 className="text-lg font-bold mb-1 text-green-400">
            {selectedCounty} Analysis
          </h2>
          <p className="text-xs text-gray-400 mb-4">{selectedDate || "Overview Mode"}</p>
          
          {isLoading ? (
            <div className="text-gray-400 animate-pulse text-sm">Loading data...</div>
          ) : statsError ? (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900">
              {statsError}
            </div>
          ) : !hasData ? (
            <div className="text-yellow-400 text-sm bg-yellow-900/20 p-3 rounded border border-yellow-700/50">
              No satellite data has been processed for this county yet.
            </div>
          ) : stats ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Mean NDVI</span>
                <span className="font-mono text-lg font-bold text-white">{stats.mean}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Max NDVI</span>
                <span className="font-mono text-white">{stats.max}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Min NDVI</span>
                <span className="font-mono text-white">{stats.min}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="text-gray-400">Valid Pixels</span>
                <span className="font-mono text-green-300">{stats.valid_percentage}%</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Opacity Slider */}
        {hasData && (
          <div className="absolute bottom-6 left-6 bg-gray-800 p-4 rounded-lg shadow-xl opacity-95 border border-gray-700">
            <label className="block text-sm font-medium mb-2">NDVI Layer Opacity</label>
            <input 
              type="range" min="0" max="1" step="0.1" value={opacity} 
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-48 cursor-pointer accent-green-500"
            />
            <div className="mt-4 flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1">
                <span className="bg-[#d73027] w-4 h-4 rounded-sm block"></span> <span>Stressed</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-[#1a9850] w-4 h-4 rounded-sm block"></span> <span>Healthy</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;