'use client';

import { useState } from 'react';

export default function VerifyPage() {
  const [formData, setFormData] = useState({ name: '', record_type: 'medical_licence', jurisdiction: 'Nepal', registration_number: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unable to verify â€” official registry unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleMonitor = async (recordId: string) => {
    await fetch(`/api/records/${recordId}/watch`, { method: 'POST' });
    alert('Monitoring started!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Verify Official Record</h1>
      <form onSubmit={handleVerify} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Person or Business Name</label>
          <input required type="text" className="w-full border rounded p-2" onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Record Type</label>
            <select className="w-full border rounded p-2" onChange={e => setFormData({...formData, record_type: e.target.value})}>
              <option value="medical_licence">Medical Licence</option>
              <option value="company_registration">Company Registration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Jurisdiction</label>
            <select className="w-full border rounded p-2" onChange={e => setFormData({...formData, jurisdiction: e.target.value})}>
              <option value="Nepal">Nepal</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="New Zealand">New Zealand</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Registration Number (Optional)</label>
          <input type="text" className="w-full border rounded p-2" onChange={e => setFormData({...formData, registration_number: e.target.value})} />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">
          {loading ? 'TinyFish Agent is searching official registry...' : 'Verify Record'}
        </button>
      </form>

      {error && <div className="mt-6 p-4 bg-red-50 text-red-700 rounded border border-red-100">{error}</div>}

      {result && result.outcome === 'not_found' && (
        <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded">No matching official record found.</div>
      )}

      {result && result.outcome === 'multiple_matches' && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-bold">Multiple Matches Found. Please select one:</h2>
          {result.matches.map((m: any, i: number) => (
             <div key={i} className="bg-white p-4 border rounded shadow-sm">
                <p className="font-semibold">{m.name} - #{m.registration_number}</p>
                <p className="text-sm text-slate-500">Status: {m.status}</p>
             </div>
          ))}
        </div>
      )}

      {result && result.outcome === 'verified' && (
        <div className="mt-6 bg-white p-6 border rounded shadow-sm border-green-200">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-green-800">âœ“ Verified Official Record</h2>
            <span className={`px-2 py-1 text-sm rounded ${result.verification.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {result.verification.status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-slate-500">Name:</span> <br/>{result.verification.name}</div>
            <div><span className="text-slate-500">Registry:</span> <br/>{result.verification.registry}</div>
            <div><span className="text-slate-500">Reg Number:</span> <br/>{result.verification.registration_number}</div>
            <div><span className="text-slate-500">Original Status:</span> <br/>{result.verification.original_status}</div>
          </div>
          <div className="flex gap-4">
            <a href={result.verification.source_url} target="_blank" className="text-indigo-600 hover:underline text-sm border px-3 py-1 rounded">View Official Source</a>
            <button onClick={() => handleMonitor(result.verification._id)} className="text-white bg-slate-800 hover:bg-slate-900 text-sm px-3 py-1 rounded">
              Monitor This Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
