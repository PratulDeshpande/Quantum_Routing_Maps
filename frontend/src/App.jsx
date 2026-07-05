import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { useSolver } from './hooks/useSolver';
import { getTheme } from './constants/themes';
import { TelemetryPanel } from './components/TelemetryPanel';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const solver = useSolver();
  const t = getTheme(theme);

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans ${t.bg} ${t.text} transition-colors duration-300`}>
      <Header 
        theme={theme} setTheme={setTheme} 
        showSidebar={showSidebar} setShowSidebar={setShowSidebar} 
        onOpenSettings={() => setShowSettings(true)}
        t={t}
      />
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        theme={theme} 
        t={t} 
      />
      
      <Sidebar 
        theme={theme} t={t} showSidebar={showSidebar}
        backendMode={solver.backendMode} setBackendMode={solver.setBackendMode}
        vehicleType={solver.vehicleType} setVehicleType={solver.setVehicleType}
        isFallback={solver.isFallback} isSolving={solver.isSolving}
        executionStatus={solver.executionStatus}
        handleReset={solver.handleReset} handleOptimize={solver.handleOptimize}
        metrics={solver.metrics}
        locations={solver.locations} deleteLocation={solver.deleteLocation}
        optimizedPath={solver.optimizedPath}
      />
      
      <MapView 
        theme={theme} showSidebar={showSidebar}
        locations={solver.locations} 
        optimizedPath={solver.optimizedPath} 
        routeGeometry={solver.routeGeometry}
        isSolving={solver.isSolving}
        onMapClick={solver.handleMapClick}
      />
      <TelemetryPanel
        locations={solver.locations}
        optimizedPath={solver.optimizedPath}
        routeGeometry={solver.routeGeometry}
        metrics={solver.metrics}
        executionStatus={solver.executionStatus}
        isSolving={solver.isSolving}
      />
    </div>
  );
}