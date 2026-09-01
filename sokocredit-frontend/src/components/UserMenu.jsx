import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, KeyRound } from 'lucide-react';
import { logout } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';
import ChangePinModal from './ChangePinModal';

export default function UserMenu() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const ref = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!user) return null;

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
          {initials}
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-sm font-medium text-slate-900 truncate max-w-[120px]">{user.name}</span>
          <span className="block text-[11px] text-slate-400 capitalize">{role}</span>
        </span>
        <ChevronDown size={14} className="hidden sm:block text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-brand-100 shadow-lg py-1.5 z-30"
        >
          <div className="px-3.5 py-2 border-b border-brand-50 sm:hidden">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">{role}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => { setOpen(false); setIsChangePinOpen(true); }}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-brand-50"
          >
            <KeyRound size={15} />
            Change {role === 'customer' ? 'PIN' : 'password'}
          </button>
          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}
      {isChangePinOpen && <ChangePinModal role={role} onClose={() => setIsChangePinOpen(false)} />}
    </div>
  );
}
