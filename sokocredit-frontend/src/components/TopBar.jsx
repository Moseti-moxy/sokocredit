import { Menu, Bell, Landmark } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { openNav } from '../features/ui/uiSlice';
import UserMenu from './UserMenu';

export default function TopBar({ title, subtitle }) {
  const dispatch = useDispatch();

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-brand-100">
      <div className="h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => dispatch(openNav())}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center text-white">
              <Landmark size={14} />
            </div>
          </div>

          <div className="min-w-0 hidden sm:block">
            <h1 className="font-display font-semibold text-lg text-slate-900 truncate">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            aria-label="Notifications"
            className="p-2 rounded-full text-brand-600 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <Bell size={20} />
          </button>
          <UserMenu />
        </div>
      </div>
      <div className="px-4 pb-3 sm:hidden">
        <h1 className="font-display font-semibold text-lg text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
      </div>
    </header>
  );
}
