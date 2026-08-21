import TopBar from './TopBar';
import MobileTabBar from './MobileTabBar';

export default function AppShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title={title} subtitle={subtitle} />

      <main className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-6 max-w-[1400px] mx-auto w-full">
        {children}
      </main>

      <MobileTabBar />
    </div>
  );
}
