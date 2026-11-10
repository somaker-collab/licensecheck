import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { processWebhook } from '@/lib/services/monitoring-service';
import Monitor from '@/models/Monitor';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) return NextResponse.json({ error: 'Invalid webhook token.' }, { status: 401 });
    const payload = await req.json();
    const monitorId = payload.fetch_monitor_id;
    const eventId = payload.id;
    if (typeof monitorId !== 'string' || typeof eventId !== 'string' || !eventId) return NextResponse.json({ error: 'Missing fetch monitor ID or run ID.' }, { status: 400 });
    await connectToDatabase();
    const monitor = await Monitor.findOne({ tinyfish_monitor_id: monitorId, monitoring_status: 'active' }).select('+webhook_token_hash');
    if (!monitor?.webhook_token_hash) return NextResponse.json({ error: 'Monitor not found.' }, { status: 401 });
    const receivedHash = crypto.createHash('sha256').update(token).digest();
    const storedHash = Buffer.from(monitor.webhook_token_hash, 'hex');
    if (storedHash.length !== receivedHash.length || !crypto.timingSafeEqual(storedHash, receivedHash)) return NextResponse.json({ error: 'Invalid webhook token.' }, { status: 401 });
    await processWebhook(payload, eventId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook processing failed.' }, { status: 500 });
  }
}
