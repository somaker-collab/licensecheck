import './globals.css';
import Link from 'next/link';
import { ShieldCheck, LayoutDashboard, Search, List, Activity, Bell, History } from 'lucide-react';

export const metadata = { title: 'LicenseCheck | API Verification' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b flex items-center gap-2 text-indigo-700 font-bold text-xl">
            <ShieldCheck size={28} /> LicenseCheck
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <NavItem href="/" icon={<LayoutDashboard />} label="Dashboard" />
            <NavItem href="/verify" icon={<Search />} label="Verify Record" />
            <NavItem href="/records" icon={<List />} label="Verified Records" />
            <NavItem href="/monitors" icon={<Activity />} label="Monitors" />
            <NavItem href="/alerts" icon={<Bell />} label="Change Alerts" />
          </nav>
        </aside>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </body>
    </html>
  );
}

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 transition">
      {icon} <span>{label}</span>
    </Link>
  );
}
