import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { openNav } from '../features/ui/uiSlice';
import { mobileTabItems } from './navConfig';

export default function MobileTabBar() {
  const dispatch = useDispatch();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-brand-100 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 h-16">
        {mobileTabItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isActive ? 'text-brand-600' : 'text-slate-400'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => dispatch(openNav())}
          className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-400"
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </div>
    </nav>
  );
}
