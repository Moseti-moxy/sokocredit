import { NavLink, useNavigate } from 'react-router-dom';
import { X, Landmark, Settings, LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { closeNav } from '../features/ui/uiSlice';
import { logout } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';
import { navItems } from './navConfig';

export default function NavDrawer() {
  const navOpen = useSelector((state) => state.ui.navOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  function handleLogout() {
    dispatch(closeNav());
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => dispatch(closeNav())}
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity ${
          navOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-white shadow-xl lg:hidden transform transition-transform duration-200 flex flex-col ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-brand-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
              <Landmark size={18} />
            </div>
            <span className="font-display font-semibold text-lg text-brand-700">SokoCredit</span>
          </div>
          <button
            onClick={() => dispatch(closeNav())}
            aria-label="Close menu"
            className="p-2 rounded-lg text-slate-500 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <X size={20} />
          </button>
        </div>

        {user && (
          <div className="px-5 py-3 border-b border-brand-50">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">{role}</p>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => dispatch(closeNav())}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {role === 'admin' && (
            <NavLink
              to="/settings"
              onClick={() => dispatch(closeNav())}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              <Settings size={18} />
              App Settings
            </NavLink>
          )}
        </nav>

        <div className="px-3 pb-6 pt-2 border-t border-brand-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
