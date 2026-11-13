'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type Result = any;

export default function VerifyPage() {
  const [formData, setFormData] = useState({ name: '', record_type: 'medical_licence', jurisdiction: 'Nepal', registration_number: '' });
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result>(null); const [error, setError] = useState(''); const [monitorMessage, setMonitorMessage] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null); const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!loading || startedAt === null) return;
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(interval);
  }, [loading, startedAt]);

  const timingHint = formData.registration_number.trim()
    ? 'Exact registration-number checks usually finish in about 4–15 seconds.'
    : formData.jurisdiction === 'Nepal'
      ? 'Nepal searches usually finish in about 3–8 seconds.'
      : 'Broad name searches usually take about 30–90 seconds because TinyFish Agent navigates the official registry.';

  async function poll(jobId: string, attempt = 0): Promise<void> {
    if (attempt > 60) throw new Error('Verification is taking too long. Refresh this page and try again.');
    const response = await fetch(`/api/verify/status/${jobId}`, { cache: 'no-store' });
    const data = await response.json();
    if (data.outcome === 'pending') { timer.current = setTimeout(() => { void poll(jobId, attempt + 1); }, 1500); return; }
    if (!response.ok || !data.success) throw new Error(data.error || 'Verification failed.');
    setResult(data); setLoading(false);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setStartedAt(Date.now()); setElapsedSeconds(0); setError(''); setResult(null); setMonitorMessage('');
    try {
      const response = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to start verification.');
      await poll(data.job_id);
    } catch (caught) { setLoading(false); setError(caught instanceof Error ? caught.message : 'Verification failed.'); }
  }

  async function handleMonitor(recordId: string) {
    setMonitorMessage('Starting daily TinyFish Monitor...'); const response = await fetch(`/api/records/${recordId}/watch`, { method: 'POST' }); const data = await response.json();
    setMonitorMessage(!response.ok || !data.success ? (data.error || 'Unable to start monitoring.') : 'Monitoring started.');
  }

  return <div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">TinyVerify</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Verify an official record</h1><p className="mt-2 text-sm text-slate-600">TinyFish checks the live official registry, corroborates the result, and can monitor it for status changes.</p></div>
    <form onSubmit={handleVerify} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div><label className="block text-sm font-medium">Person or business name</label><input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-2 w-full rounded border p-2" placeholder="Full name or registered company" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="block text-sm font-medium">Licence or record type</label><select value={formData.record_type} onChange={(e) => setFormData({ ...formData, record_type: e.target.value })} className="mt-2 w-full rounded border p-2"><option value="medical_licence">Medical licence</option><option value="company_registration">Company registration</option></select></div><div><label className="block text-sm font-medium">Jurisdiction</label><select value={formData.jurisdiction} onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })} className="mt-2 w-full rounded border p-2"><option value="Nepal">Nepal</option><option value="United Kingdom">United Kingdom</option><option value="New Zealand">New Zealand</option></select></div></div><div><label className="block text-sm font-medium">Licence or registration number</label><input value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })} className="mt-2 w-full rounded border p-2" placeholder="Optional registration number" /></div><button disabled={loading} className="w-full rounded bg-indigo-600 py-3 font-semibold text-white disabled:opacity-60">{loading ? `Checking official registry… ${elapsedSeconds}s elapsed` : 'Verify record'}</button><p className="text-xs text-slate-500">{loading ? 'This is an exact elapsed-time counter, not a countdown or guaranteed ETA.' : timingHint}</p></form>
    {error && <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    {result?.outcome === 'not_found' && <div className="rounded border border-yellow-200 bg-yellow-50 p-4 text-yellow-800"><b>No matching official record found.</b><p className="mt-1 text-sm">Try the exact spelling or provide a registration number.</p></div>}
    {result?.outcome === 'multiple_matches' && <section className="space-y-4"><h2 className="text-xl font-bold">Several official matches found</h2><p className="text-sm text-slate-600">LicenseCheck did not guess. Compare each candidate with its official source.</p>{result.matches.map((m: any, i: number) => <div key={`${m.source_url}-${i}`} className="rounded border bg-white p-4"><b>{m.name}</b><p className="text-sm">Number: {m.registration_number || 'Not published'} · Status: {m.status}</p><a href={m.source_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">View official source</a></div>)}</section>}
    {result?.outcome === 'verified' && <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm"><div className="flex justify-between"><div><p className="text-sm font-semibold uppercase text-emerald-700">Verified official record</p><h2 className="mt-1 text-2xl font-bold">{result.verification.name}</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold uppercase text-emerald-800">{result.verification.status}</span></div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt>Registry</dt><dd>{result.verification.registry}</dd></div><div><dt>Licence / registration number</dt><dd>{result.verification.registration_number}</dd></div><div><dt>Original status</dt><dd>{result.verification.original_status}</dd></div><div><dt>Expiry date</dt><dd>{result.verification.expiry_date ? new Date(result.verification.expiry_date).toLocaleDateString() : 'Not published'}</dd></div><div><dt>Disciplinary actions</dt><dd>{result.verification.disciplinary_actions?.length ? result.verification.disciplinary_actions.join(', ') : 'None published'}</dd></div><div><dt>Checked at</dt><dd>{new Date(result.verification.checked_at).toLocaleString()}</dd></div></dl><div className="mt-6 flex gap-3"><a href={result.verification.source_url} target="_blank" rel="noreferrer" className="rounded border px-3 py-2 text-sm text-indigo-700">View official source</a><button onClick={() => handleMonitor(result.verification.id)} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Monitor this record</button></div>{monitorMessage && <p className="mt-3 text-sm text-slate-600">{monitorMessage}</p>}</section>}
    <div className="rounded border bg-slate-50 p-4 text-sm"><b>Supported official sources</b><ul className="mt-2 list-disc pl-5"><li>Nepal Medical Council</li><li>UK General Medical Council</li><li>New Zealand Companies Register</li></ul></div></div>;
}
