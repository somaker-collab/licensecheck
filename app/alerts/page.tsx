'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('/api/alerts').then(res => res.json()).then(data => {
      if (data.success) setAlerts(data.alerts);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Bell /> Change Alerts</h1>
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="p-6 bg-white rounded shadow text-center text-slate-500">No alerts triggered yet.</div>
        ) : alerts.map((alert: any) => (
          <div key={alert._id} className={`p-4 rounded-lg shadow border ${alert.read_status ? 'bg-white' : 'bg-red-50 border-red-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-red-700">{alert.alert_type} DETECTED</h3>
                <p className="text-slate-800 mt-1">{alert.message}</p>
                <a href={alert.source_url} target="_blank" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">View Official Source</a>
              </div>
              <span className="text-xs text-slate-500">{new Date(alert.detected_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
