
import "./globals.css";
import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  Search,
  List,
  Activity,
  Bell,
} from "lucide-react";

export const metadata = {
  title: "LicenseCheck | Verification Dashboard",
  description:
    "Verify professional licences and business registrations.",
};

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/verify", label: "Verify Record", icon: Search },
  { href: "/records", label: "Verified Records", icon: List },
  { href: "/monitors", label: "Monitors", icon: Activity },
  { href: "/alerts", label: "Change Alerts", icon: Bell },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="min-h-screen md:flex">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-white md:flex">
            <Link
              href="/"
              className="flex items-center gap-3 border-b border-white/10 px-6 py-7"
            >
              <div className="rounded-xl bg-blue-500 p-2">
                <ShieldCheck size={25} />
              </div>
              <div>
                <p className="text-lg font-bold">LicenseCheck</p>
                <p className="text-xs text-slate-400">
                  Verification platform
                </p>
              </div>
            </Link>

            <nav className="flex-1 space-y-2 p-4">
              <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Workspace
              </p>

              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={17} className="text-blue-400" />
                Trusted verification
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Check professional and business records against registry
                sources.
              </p>
            </div>
          </aside>

          {/* Main area */}
          <div className="min-w-0 flex-1">
            <header className="border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between px-4 py-4 sm:px-8">
                <div className="flex items-center gap-2 md:hidden">
                  <ShieldCheck className="text-blue-600" size={25} />
                  <span className="font-bold">LicenseCheck</span>
                </div>

                <div className="hidden text-sm text-slate-500 md:block">
                  Professional & Business Verification
                </div>

                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Dashboard
                </div>
              </div>

              {/* Mobile navigation */}
              <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-3 py-3 md:hidden">
                {navigation.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <Icon size={15} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </header>

            <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
              {children}
            </main>

            <footer className="border-t border-slate-200 px-6 py-5 text-center text-xs text-slate-500">
              LicenseCheck · Professional & Business Verification
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
