import ThemeToggle from "@/components/ui/ThemeToggle";
import { TH_TEXT } from "@/constants/th";
import SidebarItem from "./SidebarItem";

function DashboardIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5h6.75V3.75H3.75v9.75Zm0 6.75h6.75V16.5H3.75v3.75Zm9.75 0h6.75V10.5H13.5v9.75Zm0-12.75h6.75V3.75H13.5V7.5Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v1.125h.75A1.5 1.5 0 0 1 21.75 10.125v6.75a1.5 1.5 0 0 1-1.5 1.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13.5h.01" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5m-16.5 3.75h16.5M4.5 19.5h15M4.5 15h15" />
    </svg>
  );
}

const navItems = [
  { href: "/dashboard", label: TH_TEXT.navigation.dashboard, icon: <DashboardIcon /> },
  { href: "/wallet", label: TH_TEXT.navigation.wallet, icon: <WalletIcon /> },
  { href: "/transactions", label: TH_TEXT.navigation.transactions, icon: <TransactionsIcon /> },
  { href: "/profile", label: TH_TEXT.navigation.profile, icon: <ProfileIcon /> },
];

export default function Sidebar() {
  return (
    <>
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
              <WalletIcon />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">{TH_TEXT.app.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{TH_TEXT.app.tagline}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="mt-3 grid grid-cols-3 gap-2" aria-label={TH_TEXT.app.mainNavigation}>
          {navItems.map((item) => (
            <SidebarItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>
      </header>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-slate-200/80 bg-white/90 px-4 py-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
            <WalletIcon />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">{TH_TEXT.app.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{TH_TEXT.app.tagline}</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label={TH_TEXT.app.mainNavigation}>
          {navItems.map((item) => (
            <SidebarItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{TH_TEXT.app.appearance}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{TH_TEXT.app.appearanceHint}</p>
          </div>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
