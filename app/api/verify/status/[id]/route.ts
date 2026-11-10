import { NextResponse } from 'next/server';
import VerificationJob from '@/models/VerificationJob';
import Record from '@/models/Record';
import VerificationHistory from '@/models/VerificationHistory';
import { connectToDatabase } from '@/lib/mongodb';
import { getRegistryAdapter } from '@/lib/services/verification-service';
import { TinyFishClient } from '@/lib/tinyfish/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const MAX_JOB_AGE_MS = 180_000;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

function response(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init.headers || {}),
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await connectToDatabase();

    const job = await VerificationJob.findById(params.id);
    if (!job) {
      return response(
        { success: false, error: 'Verification job not found.' },
        { status: 404 },
      );
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return response({
        success: job.status === 'completed',
        ...job.result,
        error: job.error,
      });
    }

    const createdAt = job.createdAt instanceof Date
      ? job.createdAt.getTime()
      : new Date(String(job.createdAt)).getTime();

    if (Number.isFinite(createdAt) && Date.now() - createdAt > MAX_JOB_AGE_MS) {
      if (job.jurisdiction === 'Nepal') {
        const adapter = getRegistryAdapter(job.jurisdiction, job.record_type);
        const fallbackMatches = await adapter.corroborate([], {
          name: job.name,
          registration_number: job.registration_number,
          jurisdiction: job.jurisdiction,
          record_type: job.record_type,
        });
        if (fallbackMatches.length === 0 || fallbackMatches.length > 1) {
          const result = fallbackMatches.length > 1
            ? { success: true, outcome: 'multiple_matches', matches: fallbackMatches }
            : { success: true, outcome: 'not_found', matches: [] };
          job.status = 'completed';
          job.result = result;
          await job.save();
          return response(result);
        }
      }
      const error = 'TinyFish verification timed out. Please retry with an exact registration number.';
      job.status = 'failed';
      job.error = error;
      await job.save();

      return response(
        { success: false, outcome: 'failed', error },
        { status: 504 },
      );
    }

    const verificationRequest = {
      name: job.name,
      registration_number: job.registration_number,
      jurisdiction: job.jurisdiction,
      record_type: job.record_type,
    };
    const fastFetchJob = job.run_id.startsWith('fast-fetch:');
    const adapter = getRegistryAdapter(job.jurisdiction, job.record_type);
    const fastMatches = fastFetchJob
      ? await adapter.corroborate([], verificationRequest)
      : null;
    const run: any = fastFetchJob
      ? { status: 'COMPLETED', result: { matches: fastMatches || [] }, error: null }
      : await TinyFishClient.getRun(job.run_id);

    if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) {
      return response({
        success: true,
        outcome: 'pending',
        status: run.status,
      });
    }

    if (run.status !== 'COMPLETED') {
      const error = run.error?.message || `TinyFish Agent ended with status ${run.status}.`;
      job.status = 'failed';
      job.error = error;
      await job.save();

      return response(
        { success: false, outcome: 'failed', error },
        { status: 502 },
      );
    }

    const matches = fastFetchJob
      ? (fastMatches || [])
      : await adapter.corroborate(run.result?.matches || [], verificationRequest);

    if (matches.length === 0) {
      const result = {
        success: true,
        outcome: 'not_found',
        matches: [],
      };
      job.status = 'completed';
      job.result = result;
      await job.save();
      return response(result);
    }

    if (matches.length > 1) {
      const result = {
        success: true,
        outcome: 'multiple_matches',
        matches,
      };
      job.status = 'completed';
      job.result = result;
      await job.save();
      return response(result);
    }

    const match = matches[0];
    const record = await Record.create({
      name: match.name,
      record_type: job.record_type,
      jurisdiction: job.jurisdiction,
      registry: adapter.registryName,
      registration_number: match.registration_number || 'Not published',
      status: match.status,
      original_status: match.original_status,
      expiry_date: match.expiry_date,
      registration_date: match.registration_date,
      disciplinary_actions: match.disciplinary_actions || [],
      restrictions: match.restrictions || [],
      source_url: match.source_url,
      match_confidence: 'confirmed',
      verification_outcome: 'verified',
      checked_at: new Date(),
    });

    await VerificationHistory.create({
      record_id: record._id,
      new_status: record.status,
      source_url: record.source_url,
      change_summary: 'Initial verification completed via TinyFish Agent and Fetch against the official registry.',
    });

    const result = {
      success: true,
      outcome: 'verified',
      verification: {
        id: record._id.toString(),
        name: record.name,
        record_type: record.record_type,
        jurisdiction: record.jurisdiction,
        registry: record.registry,
        registration_number: record.registration_number,
        status: record.status,
        original_status: record.original_status,
        expiry_date: record.expiry_date,
        registration_date: record.registration_date,
        disciplinary_actions: record.disciplinary_actions,
        restrictions: record.restrictions,
        source_url: record.source_url,
        checked_at: record.checked_at,
        verification_outcome: record.verification_outcome,
      },
    };

    job.status = 'completed';
    job.result = result;
    await job.save();

    return response(result);
  } catch (error: unknown) {
    return response(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Unable to read verification status.',
      },
      { status: 500 },
    );
  }
}
