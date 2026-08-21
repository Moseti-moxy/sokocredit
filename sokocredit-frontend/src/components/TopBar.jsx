import { Bell, Landmark } from 'lucide-react';
import NavDropdown from './NavDropdown';
import UserMenu from './UserMenu';

export default function TopBar({ title, subtitle }) {
  return (
    <header className="bg-white border-b border-brand-100">
      <div className="h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <NavDropdown />

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
