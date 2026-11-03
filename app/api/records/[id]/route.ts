import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Record from '@/models/Record';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const record = await Record.findById(params.id);
    if (!record) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
