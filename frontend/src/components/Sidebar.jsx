import { SolverControls } from './SolverControls';
import { MetricsPanel } from './MetricsPanel';
import { LocationList } from './LocationList';

export const Sidebar = ({ 
  theme, t, showSidebar, 
  backendMode, setBackendMode,
  vehicleType, setVehicleType,
  isFallback, isSolving,
  executionStatus, handleReset, handleOptimize,
  metrics, locations, deleteLocation, optimizedPath
}) => {
  return (
    <div className={`fixed top-14 bottom-0 left-0 z-40 w-full md:w-80 flex flex-col transform transition-transform duration-300 ease-in-out ${showSidebar?'translate-x-0':'-translate-x-full'} ${t.sidebar}`}>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            <div className={`p-3 rounded text-xs leading-relaxed ${theme==='dark'?'bg-slate-800 text-slate-400':'bg-blue-50 text-blue-900 border border-blue-100'}`}>
                <p><strong>Hybrid Quantum Optimization:</strong> Solves TSP using IBM Qiskit Runtime or D-Wave Annealers. Select "Cloud" to dispatch to real hardware.</p>
            </div>

            <SolverControls 
                backendMode={backendMode} setBackendMode={setBackendMode}
                vehicleType={vehicleType} setVehicleType={setVehicleType}
                isFallback={isFallback} isSolving={isSolving}
                executionStatus={executionStatus} 
                handleReset={handleReset} handleOptimize={handleOptimize}
                t={t} theme={theme}
            />

            <MetricsPanel metrics={metrics} t={t} />

            <LocationList 
                locations={locations} deleteLocation={deleteLocation}
                optimizedPath={optimizedPath} isSolving={isSolving}
                theme={theme}
            />
        </div>
    </div>
  );
};
