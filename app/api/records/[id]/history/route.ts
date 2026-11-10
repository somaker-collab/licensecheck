import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import VerificationHistory from '@/models/VerificationHistory';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    // Fetch all history for a specific record ID
    const history = await VerificationHistory.find({ record_id: params.id }).sort({ checked_at: -1 });
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
