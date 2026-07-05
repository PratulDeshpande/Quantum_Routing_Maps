import { useState, useRef, useEffect } from 'react';
import polyline from '@mapbox/polyline';
import { BACKEND_URL, MAX_POLLS, POLL_INTERVAL_MS } from '../constants/config';
import { solveLocalSimulation } from '../solvers/simulatedAnnealing';

export const useSolver = () => {
  const [locations, setLocations] = useState([]);
  const [optimizedPath, setOptimizedPath] = useState([]);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [isSolving, setIsSolving] = useState(false);
  const [metrics, setMetrics] = useState({ energy: 0, depth: 0, qubits: 0, convergence: 0 });
  const [backendMode, setBackendMode] = useState('browser'); 
  const [vehicleType, setVehicleType] = useState('truck');
  const [executionStatus, setExecutionStatus] = useState(""); 
  const [isFallback, setIsFallback] = useState(false); 

  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
        if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleMapClick = async (lat, lng) => {
    if(isSolving) return;
    const newId = Date.now();
    setLocations(p => [...p, { lat, lng, type: p.length===0?'depot':'delivery', id: newId, address: 'Loading...' }]);
    setOptimizedPath([]);
    setRouteGeometry([]);
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'QuantumMaps/1.0 (https://github.com/PratulDeshpande/Quantum_Routing_Maps)' }
        });
        const data = await res.json();
        const addr = data.display_name ? data.display_name.split(',')[0] : 'Unknown';
        setLocations(p => p.map(l => l.id === newId ? { ...l, address: addr } : l));
    } catch(e){}
  };

  const fetchRouteGeometry = async (route, locs) => {
    if(!route || route.length === 0) return [];
    try {
        const coordsStr = route.map(i => `${locs[i].lng},${locs[i].lat}`).join(';');
        const fullStr = `${coordsStr};${locs[route[0]].lng},${locs[route[0]].lat}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${fullStr}?overview=full`);
        const data = await res.json();
        if(data.routes && data.routes.length > 0) {
            return polyline.decode(data.routes[0].geometry);
        }
    } catch (e) {
        console.error("OSRM Polyline Error:", e);
    }
    return [];
  };

  const handleOptimize = async () => {
    if(locations.length < 2) return alert("Add at least 2 locations.");
    setIsSolving(true);
    setIsFallback(false);
    setExecutionStatus("Initializing...");
    setMetrics({ energy: 0, depth: 0, qubits: 0, convergence: 0 });

    if(backendMode === 'browser') {
        setExecutionStatus("Running Browser Heuristic...");
        solveLocalSimulation(locations, async (path) => {
            setOptimizedPath(path);
            const geom = await fetchRouteGeometry(path, locations);
            setRouteGeometry(geom);
        }, setMetrics, () => {
            setIsSolving(false);
            setExecutionStatus("Completed (Browser)");
        });
    } else {
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;
        try {
            setExecutionStatus(`Submitting to ${backendMode === 'cloud' ? 'Quantum Cloud' : 'Local Backend'}...`);
            
            const startRes = await fetch(`${BACKEND_URL}/solve`, {
                method: 'POST', 
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ 
                    locations, 
                    solver_mode: backendMode,
                    custom_ibm_token: localStorage.getItem('ibm_token') || null,
                    developer_secret: localStorage.getItem('dev_secret') || null
                }),
                mode: 'cors',
                signal
            });
            if(!startRes.ok) throw new Error("Connection Failed");
            const { job_id } = await startRes.json();

            let pollCount = 0;
            while (pollCount < MAX_POLLS && !signal.aborted) {
                pollCount++;
                try {
                    const pollRes = await fetch(`${BACKEND_URL}/status/${job_id}`, { signal });
                    const statusData = await pollRes.json();
                    
                    if(statusData.status === 'completed') {
                        const r = statusData.result;
                        setOptimizedPath(r.route);
                        const geom = await fetchRouteGeometry(r.route, locations);
                        setRouteGeometry(geom);
                        
                        setMetrics({ energy: r.energy, depth: r.depth || 50, qubits: r.qubits || locations.length**2, convergence: 100 });
                        setIsSolving(false);
                        setExecutionStatus(`${r.method}`);
                        
                        if (r.method && r.method.toLowerCase().includes('fallback')) {
                             setIsFallback(true);
                        }
                        break;
                    } else if(statusData.status === 'failed') {
                        throw new Error(statusData.error || "Job failed");
                    } else {
                        setExecutionStatus(`Processing... (${pollCount}/${MAX_POLLS})`);
                        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
                    }
                } catch(e) {
                    if (e.name === 'AbortError') return;
                    throw e;
                }
            }
            if (pollCount >= MAX_POLLS) {
                setExecutionStatus("Timed out waiting for result.");
                setIsSolving(false);
            }

        } catch(err) {
            if (err.name === 'AbortError') return;
            console.error(err);
            setExecutionStatus("Connection Failed");
            alert("Connection Failed. Switching to Browser Mode.");
            setBackendMode('browser');
            setIsFallback(true); 
            solveLocalSimulation(locations, async (path) => {
                setOptimizedPath(path);
                const geom = await fetchRouteGeometry(path, locations);
                setRouteGeometry(geom);
            }, setMetrics, () => setIsSolving(false));
        }
    }
  };

  const handleReset = () => {
      setLocations([]);
      setOptimizedPath([]);
      setRouteGeometry([]);
      setMetrics({ energy: 0, depth: 0, qubits: 0, convergence: 0 });
      setExecutionStatus("");
      setIsFallback(false);
      if (abortRef.current) abortRef.current.abort();
  };

  const deleteLocation = (idx) => {
    if(!isSolving) setLocations(p => p.filter((_, x) => x !== idx));
  };

  return {
      locations, optimizedPath, routeGeometry, isSolving,
      metrics, backendMode, vehicleType,
      executionStatus, isFallback,
      setBackendMode, setVehicleType, deleteLocation,
      handleMapClick, handleOptimize, handleReset
  };
};
