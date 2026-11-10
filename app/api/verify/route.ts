import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import VerificationJob from '@/models/VerificationJob';
import { getRegistryAdapter } from '@/lib/services/verification-service';
import { validateVerificationRequest } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const safeData = validateVerificationRequest(await req.json());
    const adapter = getRegistryAdapter(safeData.jurisdiction, safeData.record_type);
    const runId = safeData.jurisdiction === 'Nepal' && safeData.record_type === 'medical_licence'
      ? `fast-fetch:${crypto.randomUUID()}`
      : (await adapter.startAsync(safeData)).runId;
    const job = await VerificationJob.create({
      run_id: runId,
      name: safeData.name,
      registration_number: safeData.registration_number,
      record_type: safeData.record_type,
      jurisdiction: safeData.jurisdiction,
    });
    return NextResponse.json({ success: true, outcome: 'pending', job_id: job._id.toString(), run_id: runId }, { status: 202 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to start verification.';
    return NextResponse.json({ success: false, error: message }, { status: message.includes('required') || message.includes('Unsupported') ? 400 : 500 });
  }
}
