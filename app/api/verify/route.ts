
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Record from '@/models/Record';
import VerificationHistory from '@/models/VerificationHistory';
import { getRegistryAdapter } from '@/lib/services/verification-service';
import { validateVerificationRequest } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const rawBody = await req.json();

    // Validate the user's request
    const safeData = validateVerificationRequest(rawBody);

    // Select the correct official registry
    const adapter = getRegistryAdapter(
      safeData.jurisdiction,
      safeData.record_type
    );

    // Verify the record using TinyFish
    const result = await adapter.verify(safeData);

    if (result.matches.length === 0) {
      return NextResponse.json({
        success: true,
        outcome: 'not_found',
        matches: [],
      });
    }

    if (result.matches.length > 1) {
      return NextResponse.json({
        success: true,
        outcome: 'multiple_matches',
        matches: result.matches,
      });
    }

    const match = result.matches[0];
    const checkedAt = new Date();

    // Save the verified record and supporting information
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
      checked_at: checkedAt,
    });

    await VerificationHistory.create({
      record_id: record._id,
      new_status: record.status,
      source_url: record.source_url,
      change_summary:
        'Initial verification completed successfully via Official Registry.',
    });

    return NextResponse.json({
      success: true,
      outcome: 'verified',
      verification: record,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.message?.includes('Unsupported') ? 400 : 500,
      }
    );
  }
}
