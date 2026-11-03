import { connectToDatabase } from '@/lib/mongodb';
import Record from '@/models/Record';
import Monitor from '@/models/Monitor';
import Alert from '@/models/Alert';
import { ShieldCheck, Activity, AlertTriangle, Users } from 'lucide-react';

export const revalidate = 0; // Ensures fresh data on Vercel

export default async function DashboardPage() {
  await connectToDatabase();

  // Fetch real statistics from MongoDB
  const totalRecords = await Record.countDocuments();
  const activeRecords = await Record.countDocuments({ status: 'active' });
  const totalMonitors = await Monitor.countDocuments({ monitoring_status: 'active' });
  const recentAlerts = await Alert.countDocuments({ read_status: false });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Overview Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Verified" value={totalRecords} icon={<Users />} color="bg-blue-50 text-blue-700" />
        <StatCard title="Active Licences" value={activeRecords} icon={<ShieldCheck />} color="bg-green-50 text-green-700" />
        <StatCard title="Active Monitors" value={totalMonitors} icon={<Activity />} color="bg-indigo-50 text-indigo-700" />
        <StatCard title="Unread Alerts" value={recentAlerts} icon={<AlertTriangle />} color="bg-red-50 text-red-700" />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <p className="text-slate-600">Database connected. Vercel deployment active. Ready to process TinyFish verifications and webhooks.</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-full ${color}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
