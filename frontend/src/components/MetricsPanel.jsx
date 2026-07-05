import { Icons } from '../icons';

export const MetricsPanel = ({ metrics, t }) => {
  return (
    <div className={`p-4 rounded border ${t.card}`}>
        <h3 className="text-xs font-bold uppercase mb-3 opacity-80 flex items-center gap-2"><Icons.Zap className="w-3 h-3"/> Metrics</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
            <div><div className="text-[10px] opacity-60">Cost</div><div className={`text-lg font-mono font-bold ${t.highlight}`}>{metrics.energy.toFixed(1)}</div></div>
            <div><div className="text-[10px] opacity-60">Depth / Iteration</div><div className="text-lg font-mono font-bold">{metrics.depth}</div></div>
            <div><div className="text-[10px] opacity-60">Qubits</div><div className="text-lg font-mono font-bold">{typeof metrics.qubits === 'number' ? metrics.qubits : '—'}</div></div>
            <div><div className="text-[10px] opacity-60">Converge</div><div className="text-lg font-mono font-bold">{metrics.convergence}%</div></div>
        </div>
    </div>
  );
};
