import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Monitor from '@/models/Monitor';

export async function GET() {
  try {
    await connectToDatabase();
    const monitors = await Monitor.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, monitors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
