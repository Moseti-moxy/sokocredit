import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Landmark, Settings, LogOut } from 'lucide-react';
import { navItems } from './navConfig';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../features/auth/authSlice';

export default function Sidebar() {
  const { role } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-brand-100 bg-white h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-brand-100">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
          <Landmark size={18} />
        </div>
        <span className="font-display font-semibold text-lg text-brand-700">SokoCredit</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
      </nav>

      <div className="px-3 pb-4 space-y-1">
        {role === 'admin' && (
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-brand-50 hover:text-brand-700"
          >
            <Settings size={18} />
            App Settings
          </NavLink>
        )}
        {role === 'customer' && (
          <NavLink
            to="/customer-settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-brand-50 hover:text-brand-700"
          >
            <Settings size={18} />
            Settings
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
