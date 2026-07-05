import React from 'react';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

export const TelemetryPanel = ({ locations, optimizedPath, metrics, executionStatus, isSolving }) => {
    if (!executionStatus && !isSolving && optimizedPath.length === 0) return null;

    let naiveDistance = 0;
    let optDistance = 0;

    if (locations.length > 1) {
        // Calculate Naive (Sequential) Distance
        for (let i = 0; i < locations.length - 1; i++) {
            naiveDistance += calculateDistance(locations[i].lat, locations[i].lng, locations[i+1].lat, locations[i+1].lng);
        }
        naiveDistance += calculateDistance(locations[locations.length-1].lat, locations[locations.length-1].lng, locations[0].lat, locations[0].lng);

        // Calculate Optimized Distance
        if (optimizedPath.length > 0) {
            for (let i = 0; i < optimizedPath.length - 1; i++) {
                const idx1 = optimizedPath[i];
                const idx2 = optimizedPath[i+1];
                optDistance += calculateDistance(locations[idx1].lat, locations[idx1].lng, locations[idx2].lat, locations[idx2].lng);
            }
            const last = optimizedPath[optimizedPath.length-1];
            const first = optimizedPath[0];
            optDistance += calculateDistance(locations[last].lat, locations[last].lng, locations[first].lat, locations[first].lng);
        }
    }

    const nQubits = locations.length ** 2;

    return (
        <div className="absolute top-4 right-4 z-[1000] w-80 glass-panel text-slate-100 p-4 rounded-xl shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Quantum Telemetry</h3>
            
            {isSolving ? (
                <div className="flex flex-col items-center justify-center p-4 gap-3">
                    <div className="qubit-loader"></div>
                    <span className="text-sm font-medium animate-pulse">{executionStatus}</span>
                </div>
            ) : (
                <div className="flex flex-col gap-3 text-sm">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <span className="text-slate-400">Solver Method</span>
                        <span className="font-semibold text-right max-w-[150px] break-words">{executionStatus.replace('QAOA', 'QAOA').replace('Finished via ', '')}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <span className="text-slate-400">Simulated Qubits</span>
                        <span className="font-mono text-blue-400">{locations.length > 0 ? nQubits : 0}</span>
                    </div>

                    {optimizedPath.length > 0 && (
                        <>
                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                <span className="text-slate-400">Naive Distance</span>
                                <span className="font-mono">{naiveDistance.toFixed(2)} km</span>
                            </div>
                            <div className="flex justify-between items-center pb-1">
                                <span className="text-slate-400">Optimized Distance</span>
                                <span className="font-mono text-emerald-400 font-bold">{optDistance.toFixed(2)} km</span>
                            </div>
                            
                            {optDistance < naiveDistance && (
                                <div className="text-xs text-center mt-1 text-emerald-500 bg-emerald-900/30 py-1 rounded">
                                    Saved {(naiveDistance - optDistance).toFixed(2)} km!
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
