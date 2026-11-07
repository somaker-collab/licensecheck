import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Record from '@/models/Record';
import VerificationHistory from '@/models/VerificationHistory';
import { getRegistryAdapter } from '@/lib/services/verification-service';
import { validateVerificationRequest } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const safeData = validateVerificationRequest(await req.json());
    const adapter = getRegistryAdapter(safeData.jurisdiction, safeData.record_type);
    const result = await adapter.verify(safeData);
    if (result.matches.length === 0) return NextResponse.json({ success: true, outcome: 'not_found', matches: [] });
    if (result.matches.length > 1) return NextResponse.json({ success: true, outcome: 'multiple_matches', matches: result.matches });
    const match = result.matches[0];
    const record = await Record.create({
      name: match.name,
      record_type: safeData.record_type,
      jurisdiction: safeData.jurisdiction,
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
    await VerificationHistory.create({ record_id: record._id, new_status: record.status, source_url: record.source_url, change_summary: 'Initial verification completed via TinyFish Agent and Fetch against the official registry.' });
    return NextResponse.json({
      success: true,
      outcome: 'verified',
      verification: {
        id: record._id.toString(), name: record.name, record_type: record.record_type, jurisdiction: record.jurisdiction,
        registry: record.registry, registration_number: record.registration_number, status: record.status,
        original_status: record.original_status, expiry_date: record.expiry_date, registration_date: record.registration_date,
        disciplinary_actions: record.disciplinary_actions, restrictions: record.restrictions, source_url: record.source_url,
        checked_at: record.checked_at, verification_outcome: record.verification_outcome,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed.';
    return NextResponse.json({ success: false, error: message }, { status: message.includes('Unsupported') || message.includes('required') ? 400 : 500 });
  }
}
