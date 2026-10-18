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

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  
  const [opacity, setOpacity] = useState(0.8);
  const [stats, setStats] = useState<NDVIStats | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("Jan 2024");
  
  // State for Anomaly Layer
  const [showAnomalies, setShowAnomalies] = useState<boolean>(false);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/v1/observations')
      .then((res) => res.json())
      .then((data) => setAvailableDates(data))
      .catch((err) => console.error("Failed to load dates:", err));
  }, []);

  useEffect(() => {
    setStats(null); 
    fetch(`http://127.0.0.1:8000/api/v1/ndvi-statistics?date=${encodeURIComponent(selectedDate)}`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to load stats:", err));
  }, [selectedDate]);

  useEffect(() => {
    if (map.current) return; 

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', 
      center: [34.575, 0.575], 
      zoom: 13,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      const layers = map.current.getStyle().layers;
      let firstSymbolId: string | undefined;
      if (layers) {
        for (const layer of layers) {
          if (layer.type === 'symbol') { 
            firstSymbolId = layer.id;
            break;
          }
        }
      }

      // 1. Add NDVI Base Layer
      map.current.addSource('ndvi-raster', {
        type: 'image',
        url: `http://127.0.0.1:8000/api/v1/ndvi-image?date=${encodeURIComponent(selectedDate)}`,
        coordinates: [[34.55, 0.60], [34.60, 0.60], [34.60, 0.55], [34.55, 0.55]]
      });

      map.current.addLayer({
        id: 'ndvi-layer',
        type: 'raster',
        source: 'ndvi-raster',
        paint: { 'raster-opacity': opacity }
      }, firstSymbolId);

      // 2. Add Anomaly Layer (initially hidden with opacity 0)
      map.current.addSource('anomaly-raster', {
        type: 'image',
        url: 'http://127.0.0.1:8000/api/v1/ndvi-anomaly',
        coordinates: [[34.55, 0.60], [34.60, 0.60], [34.60, 0.55], [34.55, 0.55]]
      });

      map.current.addLayer({
        id: 'anomaly-layer',
        type: 'raster',
        source: 'anomaly-raster',
        paint: { 
          'raster-opacity': 0 // Start invisible
        }
      }, firstSymbolId);
    });
  }, []);

  // Update NDVI image when selectedDate changes
  useEffect(() => {
    if (map.current && map.current.getSource('ndvi-raster')) {
      const source = map.current.getSource('ndvi-raster') as maplibregl.ImageSource;
      source.updateImage({
        url: `http://127.0.0.1:8000/api/v1/ndvi-image?date=${encodeURIComponent(selectedDate)}`
      });
    }
  }, [selectedDate]);

  // Toggle Anomaly Layer visibility
  useEffect(() => {
    if (map.current && map.current.getLayer('anomaly-layer')) {
      map.current.setPaintProperty('anomaly-layer', 'raster-opacity', showAnomalies ? 1 : 0);
    }
  }, [showAnomalies]);

  // Update base NDVI opacity
  useEffect(() => {
    if (map.current && map.current.getLayer('ndvi-layer')) {
      map.current.setPaintProperty('ndvi-layer', 'raster-opacity', opacity);
    }
  }, [opacity]);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white font-sans">
      <header className="bg-green-900 p-4 shadow-md flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">SHAMBA AI</h1>
          <p className="text-sm text-green-200">See Your Fields. Understand Your Crops.</p>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Anomaly Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-gray-800 px-4 py-2 rounded border border-gray-700 hover:bg-gray-700 transition">
            <input 
              type="checkbox" 
              checked={showAnomalies}
              onChange={(e) => setShowAnomalies(e.target.checked)}
              className="w-4 h-4 accent-red-500 cursor-pointer"
            />
            <span className="text-sm font-bold text-red-400">Show Anomalies</span>
          </label>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-green-200">Date:</label>
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-green-800 text-white text-sm px-4 py-2 rounded border border-green-700 focus:outline-none focus:border-green-500 cursor-pointer font-semibold"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-grow relative">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        
        <div className="absolute top-6 left-6 bg-gray-800 p-5 rounded-lg shadow-xl opacity-95 border border-gray-700 w-64">
          <h2 className="text-lg font-bold mb-4 border-b border-gray-600 pb-2 text-green-400">
            Field Analysis
          </h2>
          
          {stats ? (
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
          ) : (
            <div className="text-gray-400 animate-pulse text-sm">
              Loading statistics...
            </div>
          )}
        </div>

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
      </main>
    </div>
  );
}

export default App;