import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import NavDropdown from './NavDropdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../features/notifications/notificationsApi';
import UserMenu from './UserMenu';

const POLL_INTERVAL_MS = 30000;

export default function TopBar({ title, subtitle }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const canViewNotifications = Boolean(role);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    if (!canViewNotifications) return;
    let cancelled = false;
    const refresh = () => {
      getNotifications()
        .then((data) => { if (!cancelled) setNotifications(data); })
        .catch(() => { if (!cancelled) setNotifications([]); });
    };
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [canViewNotifications]);

  function markAllRead() {
    markAllNotificationsRead()
      .then(() => setNotifications((current) => current.map((n) => ({ ...n, isRead: true }))))
      .catch(() => {});
  }

  function openNotification(notification) {
    setIsNotificationsOpen(false);
    markNotificationRead(notification.id)
      .then(() => setNotifications((current) => current.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))))
      .catch(() => {});
    navigate(role === 'customer' ? '/' : '/loans?view=pending');
  }
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
          {canViewNotifications && <div className="relative"><button onClick={() => setIsNotificationsOpen((open) => !open)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={isNotificationsOpen} className="relative rounded-full p-2 text-brand-600 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"><Bell size={20} />{unreadCount > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>{isNotificationsOpen && <section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-brand-100 bg-white shadow-xl" aria-label="Notifications"><div className="flex items-center justify-between border-b border-brand-100 px-4 py-3"><h2 className="font-display text-sm font-semibold text-slate-900">Notifications</h2>{unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">Mark all read</button>}</div>{notifications.length ? <div className="max-h-80 overflow-y-auto">{notifications.map((notification) => <button type="button" key={notification.id} onClick={() => openNotification(notification)} className={`block w-full border-b border-brand-50 px-4 py-3 text-left last:border-0 hover:bg-brand-50 ${notification.isRead ? 'bg-white' : 'bg-brand-50/60'}`}><p className="text-sm font-semibold text-slate-900">{notification.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p></button>)}</div> : <p className="p-5 text-center text-sm text-slate-500">No new notifications.</p>}</section>}</div>}
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