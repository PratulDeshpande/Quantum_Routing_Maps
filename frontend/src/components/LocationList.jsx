import { Icons } from '../icons';

export const LocationList = ({ locations, deleteLocation, optimizedPath, isSolving, theme }) => {
  const handleExport = () => {
    if(locations.length === 0) return alert("No data to export");
    const data = { date: new Date(), locations, route: optimizedPath };
    const b = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'route_data.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase opacity-70">Locations ({locations.length})</span>
            <button onClick={handleExport} className="text-[10px] underline opacity-70 hover:opacity-100">Export JSON</button>
        </div>
        <div className="max-h-40 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {locations.map((l,i) => (
                <div key={l.id} className={`p-2 rounded border flex items-center gap-2 text-xs ${theme==='dark'?'bg-slate-800 border-slate-700':'bg-white border-gray-200'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] ${l.type==='depot'?'bg-[#002D72]':'bg-[#009CDE]'}`}>
                        {optimizedPath.includes(i) ? optimizedPath.indexOf(i)+1 : (i===0?'D':i)}
                    </div>
                    <span className="truncate flex-1">{l.address}</span>
                    <button onClick={()=>deleteLocation(i)} className="opacity-40 hover:opacity-100 hover:text-red-500"><Icons.Trash className="w-3 h-3"/></button>
                </div>
            ))}
            {locations.length===0 && <div className="text-center py-4 opacity-40 italic text-xs">Click map to add stops</div>}
        </div>
    </div>
  );
};
