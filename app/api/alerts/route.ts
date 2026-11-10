import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Alert from '@/models/Alert';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  try {
    await connectToDatabase();

    const alerts = await Alert.find()
      .sort({ detected_at: -1 })
      .lean();

    return NextResponse.json(
      { success: true, alerts },
      { headers: noStoreHeaders },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to load alerts.',
      },
      {
        status: 500,
        headers: noStoreHeaders,
      },
    );
  }
}
