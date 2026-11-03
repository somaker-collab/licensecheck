'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/records').then(res => res.json()).then(data => {
      if (data.success) setRecords(data.records);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Verified Records</h1>
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium text-slate-600">Name</th>
              <th className="p-4 font-medium text-slate-600">Registry</th>
              <th className="p-4 font-medium text-slate-600">Reg. Number</th>
              <th className="p-4 font-medium text-slate-600">Status</th>
              <th className="p-4 font-medium text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">No records found.</td></tr>
            ) : records.map((record: any) => (
              <tr key={record._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{record.name}</td>
                <td className="p-4 text-slate-600">{record.registry}</td>
                <td className="p-4 text-slate-600">{record.registration_number || 'N/A'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${record.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {record.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4"><Link href={`/history?id=${record._id}`} className="text-indigo-600 hover:underline">View History</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
