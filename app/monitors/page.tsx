'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

type Monitor = {
  _id: string;
  tinyfish_monitor_id: string;
  schedule: string;
  monitoring_status: string;
  last_checked_at?: string;
};

function formatCheckedAt(value?: string) {
  if (!value) return 'Not checked yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Invalid check timestamp'
    : date.toLocaleString();
}

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadMonitors() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/monitors', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to load monitors.');
      }
      setMonitors(Array.isArray(data.monitors) ? data.monitors : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load monitors.');
      setMonitors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMonitors();
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Activity /> Active Monitors
        </h1>
        <button
          type="button"
          onClick={() => void loadMonitors()}
          className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="p-4">Monitor ID</th>
              <th className="p-4">Schedule</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  Loading monitors...
                </td>
              </tr>
            ) : monitors.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  No active monitors.
                </td>
              </tr>
            ) : (
              monitors.map((monitor) => (
                <tr key={monitor._id} className="border-b last:border-b-0">
                  <td className="p-4 font-medium text-slate-700">
                    {monitor.tinyfish_monitor_id}
                  </td>
                  <td className="p-4">
                    {monitor.schedule === 'daily' ? 'Once daily' : monitor.schedule}
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      {monitor.monitoring_status}
                    </span>
                  </td>
                  <td className="p-4">
                    {formatCheckedAt(monitor.last_checked_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        TinyFish checks each active monitor once daily. The timestamp is updated
        only after a real baseline or webhook check; it is never fabricated.
      </p>
    </div>
  );
}
