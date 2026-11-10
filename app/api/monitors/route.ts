import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Monitor from '@/models/Monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    await connectToDatabase();

    const monitors = await Monitor.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        monitors,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Unable to load monitors.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
