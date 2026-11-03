import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Record from '@/models/Record';

export async function GET(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  
  const query = status ? { status } : {};
  const records = await Record.find(query).sort({ createdAt: -1 });
  
  return NextResponse.json({ success: true, records });
}
