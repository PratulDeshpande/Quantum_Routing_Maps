import { useState, useEffect } from 'react';

export const SettingsModal = ({ isOpen, onClose, theme, t }) => {
    const [ibmToken, setIbmToken] = useState('');
    const [devSecret, setDevSecret] = useState('');

    useEffect(() => {
        if (isOpen) {
            setIbmToken(localStorage.getItem('ibm_token') || '');
            setDevSecret(localStorage.getItem('dev_secret') || '');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (ibmToken.trim()) localStorage.setItem('ibm_token', ibmToken.trim());
        else localStorage.removeItem('ibm_token');

        if (devSecret.trim()) localStorage.setItem('dev_secret', devSecret.trim());
        else localStorage.removeItem('dev_secret');

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md p-6 rounded-xl shadow-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                <h2 className="text-xl font-bold mb-4">Advanced Settings</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1 block">
                            Custom IBM Quantum Token
                        </label>
                        <input 
                            type="password" 
                            value={ibmToken}
                            onChange={(e) => setIbmToken(e.target.value)}
                            placeholder="Enter your own IBM API token..."
                            className={`w-full p-2.5 rounded text-sm outline-none border transition-colors ${t.input}`}
                        />
                        <p className="text-[10px] opacity-60 mt-1">
                            Bypasses the application quota and runs jobs using your own IBM account limits.
                        </p>
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1 block">
                            Developer Bypass Secret
                        </label>
                        <input 
                            type="password" 
                            value={devSecret}
                            onChange={(e) => setDevSecret(e.target.value)}
                            placeholder="Developer secret password..."
                            className={`w-full p-2.5 rounded text-sm outline-none border transition-colors ${t.input}`}
                        />
                        <p className="text-[10px] opacity-60 mt-1">
                            For administrators to bypass the IP rate limit entirely.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={onClose}
                        className={`px-4 py-2 rounded font-bold text-sm transition ${t.btnSec}`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className={`px-4 py-2 rounded font-bold text-sm transition ${t.btnPrimary}`}
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
