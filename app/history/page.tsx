'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (id) {
      fetch(`/api/records/${id}/history`).then(res => res.json()).then(data => {
        if (data.success) setHistory(data.history);
      });
    }
  }, [id]);

  if (!id) return <div className="p-8 text-center text-slate-500">Please select a record from the Records page.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Verification History Log</h1>
      <div className="space-y-6">
        {history.length === 0 ? (
          <div className="p-6 bg-white rounded shadow">No history found.</div>
        ) : history.map((log: any, index: number) => (
          <div key={log._id} className="relative pl-8 border-l-2 border-indigo-200">
            <div className="absolute w-4 h-4 bg-indigo-600 rounded-full -left-[9px] top-1"></div>
            <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">{new Date(log.checked_at).toLocaleString()}</span>
              <p className="font-medium mt-1">{log.change_summary}</p>
              {log.previous_status && log.new_status && log.previous_status !== log.new_status && (
                <p className="text-sm mt-2">
                  Status changed from <span className="bg-slate-100 px-1 rounded">{log.previous_status}</span> to <span className="bg-slate-100 px-1 rounded font-bold">{log.new_status}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
