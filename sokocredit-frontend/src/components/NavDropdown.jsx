import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Landmark, Settings, LogOut } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';
import { navItems } from './navConfig';

export default function NavDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
    setIsOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label="Navigation menu"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center text-white">
          <Landmark size={12} />
        </div>
        <span className="hidden sm:inline text-sm font-medium text-slate-700">Menu</span>
        <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-brand-100 z-50">
          {/* Header */}
          <div className="px-5 py-3 border-b border-brand-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center text-white">
                <Landmark size={14} />
              </div>
              <span className="font-display font-semibold text-brand-700">SokoCredit</span>
            </div>
            {user && (
              <>
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 capitalize">{role}</p>
              </>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-3 space-y-1 max-h-96 overflow-y-auto">
            {visibleItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setIsOpen(false)}
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
            {role === 'admin' && (
              <NavLink
                to="/settings"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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

          {/* Footer */}
          <div className="px-3 pb-3 pt-2 border-t border-brand-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
