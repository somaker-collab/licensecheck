'use client';

import { FormEvent, useState } from 'react';

type VerificationResult = any;

export default function VerifyPage() {
  const [formData, setFormData] = useState({ name: '', record_type: 'medical_licence', jurisdiction: 'Nepal', registration_number: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult>(null);
  const [error, setError] = useState('');
  const [monitorMessage, setMonitorMessage] = useState('');

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null); setMonitorMessage('');
    try {
      const response = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Verification failed.');
      setResult(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Verification failed.');
    } finally { setLoading(false); }
  }

  async function handleMonitor(recordId: string) {
    setMonitorMessage('Starting daily TinyFish Monitor...');
    const response = await fetch(`/api/records/${recordId}/watch`, { method: 'POST' });
    const data = await response.json();
    setMonitorMessage(!response.ok || !data.success ? (data.error || 'Unable to start monitoring.') : 'Monitoring started. TinyFish will send scheduled changes to LicenseCheck.');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">TinyVerify</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Verify an official record</h1><p className="mt-2 text-sm text-slate-600">TinyFish checks the live official registry, corroborates the result, and can monitor it for status changes.</p></div>
      <form onSubmit={handleVerify} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><label className="block text-sm font-medium text-slate-800">Person or business name</label><p className="mb-2 mt-1 text-xs text-slate-500">Use the spelling shown on the official registry.</p><input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded border border-slate-300 p-2" placeholder="Full name or registered company" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="block text-sm font-medium text-slate-800">Licence or record type</label><select value={formData.record_type} onChange={(e) => setFormData({ ...formData, record_type: e.target.value })} className="mt-2 w-full rounded border border-slate-300 p-2"><option value="medical_licence">Medical licence</option><option value="company_registration">Company registration</option></select></div>
          <div><label className="block text-sm font-medium text-slate-800">Jurisdiction</label><select value={formData.jurisdiction} onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })} className="mt-2 w-full rounded border border-slate-300 p-2"><option value="Nepal">Nepal</option><option value="United Kingdom">United Kingdom</option><option value="New Zealand">New Zealand</option></select></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-800">Licence or registration number</label><p className="mb-2 mt-1 text-xs text-slate-500">Optional, but improves accuracy when names are similar.</p><input value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })} className="w-full rounded border border-slate-300 p-2" placeholder="Optional registration number" /></div>
        <button disabled={loading} type="submit" className="w-full rounded bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Checking the official registry...' : 'Verify record'}</button>
      </form>
      {error && <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {result?.outcome === 'not_found' && <div className="rounded border border-yellow-200 bg-yellow-50 p-4 text-yellow-800"><p className="font-semibold">No matching official record found.</p><p className="mt-1 text-sm">Try the exact spelling used by the registry or provide a registration number.</p></div>}
      {result?.outcome === 'multiple_matches' && <section className="space-y-4"><div><h2 className="text-xl font-bold text-slate-900">Several official matches found</h2><p className="mt-1 text-sm text-slate-600">LicenseCheck did not guess. Compare the candidates with their official sources.</p></div>{result.matches.map((match: any, index: number) => <div key={`${match.source_url}-${index}`} className="rounded border border-slate-200 bg-white p-4 shadow-sm"><p className="font-semibold text-slate-900">{match.name}</p><p className="mt-2 text-sm">Number: {match.registration_number || 'Not published'} · Status: {match.status}</p><p className="text-sm">Original status: {match.original_status}</p><a href={match.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">View official source</a></div>)}</section>}
      {result?.outcome === 'verified' && <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Verified official record</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{result.verification.name}</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold uppercase text-emerald-800">{result.verification.status}</span></div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Registry</dt><dd className="font-medium">{result.verification.registry}</dd></div><div><dt className="text-slate-500">Licence / registration number</dt><dd className="font-medium">{result.verification.registration_number || 'Not published'}</dd></div><div><dt className="text-slate-500">Original status</dt><dd className="font-medium">{result.verification.original_status}</dd></div><div><dt className="text-slate-500">Expiry date</dt><dd className="font-medium">{result.verification.expiry_date ? new Date(result.verification.expiry_date).toLocaleDateString() : 'Not published'}</dd></div><div><dt className="text-slate-500">Disciplinary actions</dt><dd className="font-medium">{result.verification.disciplinary_actions?.length ? result.verification.disciplinary_actions.join(', ') : 'None published'}</dd></div><div><dt className="text-slate-500">Checked at</dt><dd className="font-medium">{new Date(result.verification.checked_at).toLocaleString()}</dd></div></dl><div className="mt-6 flex flex-wrap gap-3"><a href={result.verification.source_url} target="_blank" rel="noreferrer" className="rounded border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">View official source</a><button onClick={() => handleMonitor(result.verification.id)} className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">Monitor this record</button></div>{monitorMessage && <p className="mt-3 text-sm text-slate-600">{monitorMessage}</p>}</section>}
      <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-800">Supported official sources</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Nepal Medical Council</li><li>UK General Medical Council</li><li>New Zealand Companies Register</li></ul></div>
    </div>
  );
}
