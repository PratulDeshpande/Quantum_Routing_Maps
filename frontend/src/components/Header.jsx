import { Icons } from '../icons';

export const Header = ({ theme, setTheme, showSidebar, setShowSidebar, t }) => {

  return (
    <div className={`fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-6 ${t.header}`}>
      <div className="flex items-center gap-3">
          <div className="p-1 bg-white/10 rounded"><Icons.Atom className="w-6 h-6"/></div>
          <h1 className="font-bold text-lg tracking-tight">QAOA Route Optimizer</h1>
      </div>
      <div className="flex items-center gap-4">
          <button onClick={()=>setTheme(x=>x==='light'?'dark':'light')} className="p-2 rounded-full hover:bg-white/10 transition">
              {theme==='light'?<Icons.Moon className="w-5 h-5"/>:<Icons.Sun className="w-5 h-5"/>}
          </button>
          <button onClick={()=>setShowSidebar(!showSidebar)} className="md:hidden p-2 hover:bg-white/10 rounded"><Icons.Menu className="w-6 h-6"/></button>
      </div>
    </div>
  );
};
