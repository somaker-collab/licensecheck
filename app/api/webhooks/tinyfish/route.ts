import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { processWebhook } from '@/lib/services/monitoring-service';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // 1. Validate signature
    const signature = req.headers.get('x-tinyfish-signature');
    const body = await req.text();
    
    const expectedSig = crypto
      .createHmac('sha256', process.env.TINYFISH_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    await connectToDatabase();
    const payload = JSON.parse(body);
    const eventId = req.headers.get('x-tinyfish-event-id') || crypto.randomUUID();

    // 2. Process idempotently
    await processWebhook(payload, eventId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
