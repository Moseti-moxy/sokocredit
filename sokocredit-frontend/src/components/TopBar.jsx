import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import NavDropdown from './NavDropdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getNotifications, markAllNotificationsRead, NOTIFICATIONS_STORAGE_KEY } from '../features/notifications/notifications';
import UserMenu from './UserMenu';

export default function TopBar({ title, subtitle }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => getNotifications(role));
  const isStaff = ['admin', 'agent', 'loan_officer'].includes(role);
  const unreadCount = notifications.filter((notification) => !notification.readBy.includes(role)).length;

  useEffect(() => {
    const refresh = () => setNotifications(getNotifications(role));
    const onStorage = (event) => { if (event.key === NOTIFICATIONS_STORAGE_KEY) refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('sokocredit:notifications', refresh);
    refresh();
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('sokocredit:notifications', refresh); };
  }, [role]);

  function markAllRead() { markAllNotificationsRead(role); }
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
          {isStaff && <div className="relative"><button onClick={() => setIsNotificationsOpen((open) => !open)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={isNotificationsOpen} className="relative rounded-full p-2 text-brand-600 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"><Bell size={20} />{unreadCount > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>{isNotificationsOpen && <section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-brand-100 bg-white shadow-xl" aria-label="Notifications"><div className="flex items-center justify-between border-b border-brand-100 px-4 py-3"><h2 className="font-display text-sm font-semibold text-slate-900">Notifications</h2>{unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">Mark all read</button>}</div>{notifications.length ? <div className="max-h-80 overflow-y-auto">{notifications.map((notification) => <button type="button" key={notification.id} onClick={() => { setIsNotificationsOpen(false); navigate('/loans?view=pending'); }} className={`block w-full border-b border-brand-50 px-4 py-3 text-left last:border-0 hover:bg-brand-50 ${notification.readBy.includes(role) ? 'bg-white' : 'bg-brand-50/60'}`}><p className="text-sm font-semibold text-slate-900">{notification.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p></button>)}</div> : <p className="p-5 text-center text-sm text-slate-500">No new notifications.</p>}</section>}</div>}
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
