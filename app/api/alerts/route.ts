import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Alert from '@/models/Alert';

export async function GET() {
  try {
    await connectToDatabase();
    const alerts = await Alert.find().sort({ detected_at: -1 });
    return NextResponse.json({ success: true, alerts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
