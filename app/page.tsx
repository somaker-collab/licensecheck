
import Link from "next/link";
import {
  connectToDatabase,
} from "@/lib/mongodb";
import Record from "@/models/Record";
import Monitor from "@/models/Monitor";
import Alert from "@/models/Alert";
import {
  Users,
  ShieldCheck,
  Activity,
  Bell,
  Search,
  Building2,
  ArrowUpRight,
  Database,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await connectToDatabase();

  const [
    totalRecords,
    activeRecords,
    totalMonitors,
    unreadAlerts,
  ] = await Promise.all([
    Record.countDocuments(),
    Record.countDocuments({ status: "active" }),
    Monitor.countDocuments({ monitoring_status: "active" }),
    Alert.countDocuments({ read_status: false }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-blue-600">
            WORKSPACE OVERVIEW
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor licences, business records and verification activity.
          </p>
        </div>

        <Link
          href="/verify"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Search size={18} />
          Start verification
        </Link>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Verification summary
          </h2>
          <p className="text-sm text-slate-500">
            Current totals from your database.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Records"
            value={totalRecords}
            description="Records stored"
            icon={<Users size={21} />}
            iconStyle="bg-blue-50 text-blue-600"
          />

          <StatCard
            title="Active Licences"
            value={activeRecords}
            description="Currently marked active"
            icon={<ShieldCheck size={21} />}
            iconStyle="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Active Monitors"
            value={totalMonitors}
            description="Monitoring enabled"
            icon={<Activity size={21} />}
            iconStyle="bg-violet-50 text-violet-600"
          />

          <StatCard
            title="Unread Alerts"
            value={unreadAlerts}
            description="Require your attention"
            icon={<Bell size={21} />}
            iconStyle="bg-amber-50 text-amber-600"
          />
        </div>
      </section>

      {/* Main dashboard sections */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Quick actions
            </h2>
            <p className="text-sm text-slate-500">
              Choose what you want to do next.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ActionCard
              href="/verify"
              icon={<Search size={22} />}
              title="Verify a professional"
              description="Check a professional licence against a registry."
            />

            <ActionCard
              href="/verify"
              icon={<Building2 size={22} />}
              title="Verify a business"
              description="Start a business registration verification."
            />

            <ActionCard
              href="/records"
              icon={<ShieldCheck size={22} />}
              title="View verified records"
              description="Review the verification records in your database."
            />

            <ActionCard
              href="/monitors"
              icon={<Activity size={22} />}
              title="Manage monitoring"
              description="Review records being monitored for changes."
            />
          </div>
        </div>

        {/* System information */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              System information
            </h2>
            <p className="text-sm text-slate-500">
              Dashboard connection details.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <Database size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  Database connection
                </p>
                <p className="text-xs text-emerald-600">
                  Connected for this request
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-100" />

            <div className="flex items-center gap-3">
              <Clock size={19} className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Live database counts
                </p>
                <p className="text-xs text-slate-500">
                  Statistics are read from MongoDB.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                <CheckCircle2 size={17} />
                Verification workspace
              </div>
              <p className="mt-2 text-xs leading-5 text-blue-700">
                Use the verification page to submit a new professional or
                business record for checking.
              </p>
            </div>
          </div>

          <Link
            href="/alerts"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            View change alerts
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  iconStyle,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  iconStyle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value.toLocaleString()}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${iconStyle}`}>
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
          {icon}
        </div>
        <ArrowUpRight
          size={19}
          className="text-slate-400 transition group-hover:text-blue-600"
        />
      </div>

      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </Link>
  );
}
