'use client';
import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState([]);

  useEffect(() => {
    fetch('/api/monitors').then(res => res.json()).then(data => {
      if (data.success) setMonitors(data.monitors);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Activity /> Active Monitors</h1>
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4">Monitor ID</th>
              <th className="p-4">Schedule</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {monitors.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center">No active monitors.</td></tr>
            ) : monitors.map((m: any) => (
              <tr key={m._id} className="border-b">
                <td className="p-4 font-medium text-slate-700">{m.tinyfish_monitor_id}</td>
                <td className="p-4">{m.schedule}</td>
                <td className="p-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{m.monitoring_status}</span></td>
                <td className="p-4">{m.last_checked_at ? new Date(m.last_checked_at).toLocaleString() : 'Pending...'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
