import Sidebar from './Sidebar';
import NavDrawer from './NavDrawer';
import TopBar from './TopBar';
import MobileTabBar from './MobileTabBar';

export default function AppShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <NavDrawer />

      <div className="flex-1 min-w-0">
        <TopBar title={title} subtitle={subtitle} />
        <main className="px-4 sm:px-6 py-6 pb-24 lg:pb-6 max-w-[1400px]">
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
