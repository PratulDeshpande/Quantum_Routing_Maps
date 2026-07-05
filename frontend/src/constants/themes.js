export const getTheme = (theme) => {
  return theme === 'dark' ? {
    bg: 'bg-slate-900', text: 'text-slate-200',
    header: 'bg-slate-950 border-b border-slate-800',
    sidebar: 'bg-slate-900/95 border-r border-slate-800',
    card: 'bg-slate-800 border-slate-700',
    input: 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    btnSec: 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300',
    highlight: 'text-indigo-400'
  } : {
    bg: 'bg-[#f4f6f8]', text: 'text-[#1f2937]',
    header: 'bg-[#002D72] text-white shadow-md',
    sidebar: 'bg-white border-r border-gray-200 shadow-sm',
    card: 'bg-white border border-gray-200 shadow-sm',
    input: 'bg-white border-gray-300 text-gray-900 focus:border-[#002D72]',
    btnPrimary: 'bg-[#009CDE] hover:bg-[#0077c8] text-white shadow-sm',
    btnSec: 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700',
    highlight: 'text-[#002D72]'
  };
};
