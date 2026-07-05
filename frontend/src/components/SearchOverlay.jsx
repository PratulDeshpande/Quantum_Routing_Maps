import { Icons } from '../icons';

export const SearchOverlay = ({ searchQuery, setSearchQuery, showDropdown, setShowDropdown, searchResults, theme, onSelect }) => {
  return (
    <div className="absolute top-4 left-4 z-[400] w-72 shadow-lg rounded-lg overflow-hidden">
        <div className={`flex items-center px-3 ${theme==='dark'?'bg-slate-800':'bg-white'}`}>
            <Icons.Search className="w-4 h-4 opacity-50"/>
            <input 
                type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} 
                placeholder="Search location..." 
                className={`w-full p-3 text-sm outline-none bg-transparent ${theme==='dark'?'text-white':'text-gray-800'}`}
            />
        </div>
        {showDropdown && searchResults.length > 0 && (
            <div className={`border-t ${theme==='dark'?'bg-slate-800 border-slate-700 text-white':'bg-white border-gray-100 text-gray-800'}`}>
                {searchResults.map((p,i)=>(
                    <button key={i} onClick={() => onSelect(p.lat, p.lon)} className="block w-full text-left px-4 py-2 text-xs hover:bg-black/5 truncate">
                        {p.display_name}
                    </button>
                ))}
            </div>
        )}
    </div>
  );
};
