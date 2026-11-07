import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Record from '@/models/Record';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const records = await Record.find(status ? { status } : {}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, records });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load records.' }, { status: 500 });
  }
}
