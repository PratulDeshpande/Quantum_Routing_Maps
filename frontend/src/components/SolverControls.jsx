import { Icons } from '../icons';

export const SolverControls = ({ 
  backendMode, setBackendMode, 
  vehicleType, setVehicleType, 
  isFallback, isSolving, 
  executionStatus, handleReset, handleOptimize, t, theme
}) => {
  return (
    <div className="space-y-4">
        <div>
            <label className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1 block">Solver Engine</label>
            {isFallback && (
                <div className={`mb-2 flex items-center gap-2 p-2 rounded text-xs border ${theme==='dark'?'bg-amber-900/30 text-amber-300 border-amber-700':'bg-amber-100 text-amber-800 border-amber-200'}`}>
                    <Icons.Alert className="w-4 h-4"/>
                    <span>Fallback Active: Using Classical Simulation</span>
                </div>
            )}
            <select value={backendMode} onChange={(e)=>setBackendMode(e.target.value)} className={`w-full p-2.5 rounded text-sm outline-none border ${t.input}`}>
                <option value="cloud">☁️ QAOA Backend (IBM/D-Wave Cloud)</option>
                <option value="local">💻 QAOA Backend (Local Python Sim)</option>
                <option value="browser">🌐 Browser Simulation (Offline)</option>
            </select>
        </div>
        <div>
            <label className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1 block">Vehicle</label>
            <select value={vehicleType} onChange={(e)=>setVehicleType(e.target.value)} className={`w-full p-2.5 rounded text-sm outline-none border ${t.input}`}>
                <option value="truck">🚛 Heavy Truck</option>
                <option value="van">🚐 Delivery Van</option>
                <option value="drone">🚁 Autonomous Drone</option>
            </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <button onClick={handleReset} className={`py-2.5 rounded font-bold text-sm transition ${t.btnSec}`}>Reset</button>
            <button onClick={handleOptimize} disabled={isSolving} className={`py-2.5 rounded font-bold text-sm transition flex items-center justify-center gap-2 ${t.btnPrimary} ${isSolving?'opacity-70':''}`}>
                {isSolving ? <Icons.RotateCcw className="animate-spin w-4 h-4"/> : <Icons.Zap className="w-4 h-4"/>} Run
            </button>
        </div>
        {executionStatus && <div className="text-center text-[10px] font-mono opacity-70 mt-1">{executionStatus}</div>}
    </div>
  );
};
