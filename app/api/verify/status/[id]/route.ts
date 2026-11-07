import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import VerificationJob from '@/models/VerificationJob';
import Record from '@/models/Record';
import VerificationHistory from '@/models/VerificationHistory';
import { getRegistryAdapter } from '@/lib/services/verification-service';
import { TinyFishClient } from '@/lib/tinyfish/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const job = await VerificationJob.findById(params.id);
    if (!job) return NextResponse.json({ success: false, error: 'Verification job not found.' }, { status: 404 });
    if (job.status === 'completed' || job.status === 'failed') return NextResponse.json({ success: true, ...job.result, error: job.error });

    const run = await TinyFishClient.getRun(job.run_id);
    if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) return NextResponse.json({ success: true, outcome: 'pending', status: run.status });
    if (run.status !== 'COMPLETED') {
      job.status = 'failed'; job.error = run.error?.message || `TinyFish Agent ended with status ${run.status}.`; await job.save();
      return NextResponse.json({ success: false, outcome: 'failed', error: job.error }, { status: 502 });
    }

    const adapter = getRegistryAdapter(job.jurisdiction, job.record_type);
    const matches = await adapter.corroborate(run.result?.matches || []);
    if (matches.length === 0) {
      const result = { success: true, outcome: 'not_found', matches: [] };
      job.status = 'completed'; job.result = result; await job.save(); return NextResponse.json(result);
    }
    if (matches.length > 1) {
      const result = { success: true, outcome: 'multiple_matches', matches };
      job.status = 'completed'; job.result = result; await job.save(); return NextResponse.json(result);
    }

    const match = matches[0];
    const record = await Record.create({ name: match.name, record_type: job.record_type, jurisdiction: job.jurisdiction, registry: adapter.registryName, registration_number: match.registration_number || 'Not published', status: match.status, original_status: match.original_status, expiry_date: match.expiry_date, registration_date: match.registration_date, disciplinary_actions: match.disciplinary_actions || [], restrictions: match.restrictions || [], source_url: match.source_url, match_confidence: 'confirmed', verification_outcome: 'verified', checked_at: new Date() });
    await VerificationHistory.create({ record_id: record._id, new_status: record.status, source_url: record.source_url, change_summary: 'Initial verification completed via TinyFish Agent and Fetch against the official registry.' });
    const result = { success: true, outcome: 'verified', verification: { id: record._id.toString(), name: record.name, record_type: record.record_type, jurisdiction: record.jurisdiction, registry: record.registry, registration_number: record.registration_number, status: record.status, original_status: record.original_status, expiry_date: record.expiry_date, registration_date: record.registration_date, disciplinary_actions: record.disciplinary_actions, restrictions: record.restrictions, source_url: record.source_url, checked_at: record.checked_at, verification_outcome: record.verification_outcome } };
    job.status = 'completed'; job.result = result; await job.save(); return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to read verification status.' }, { status: 500 });
  }
}
