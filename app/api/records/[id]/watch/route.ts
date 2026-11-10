import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { setupMonitor } from '@/lib/services/monitoring-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const monitor = await setupMonitor(params.id);
    return NextResponse.json({ success: true, monitor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
