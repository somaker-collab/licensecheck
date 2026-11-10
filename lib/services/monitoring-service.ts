import crypto from 'crypto';
import Monitor from '@/models/Monitor';
import Record from '@/models/Record';
import WebhookEvent from '@/models/WebhookEvent';
import VerificationHistory from '@/models/VerificationHistory';
import { TinyFishClient } from '../tinyfish/client';
import { detectMeaningfulChange } from './change-detection';
import { createAlert } from './alert-service';

export async function setupMonitor(recordId: string) {
  const record = await Record.findById(recordId);
  if (!record) throw new Error('Record not found');

  const existingMonitor = await Monitor.findOne({
    record_id: record._id,
    monitoring_status: 'active',
  });

  if (existingMonitor) {
    return existingMonitor;
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error('NEXT_PUBLIC_APP_URL is not configured.');
  }

  const webhookToken = crypto.randomBytes(32).toString('hex');
  const webhookTokenHash = crypto
    .createHash('sha256')
    .update(webhookToken)
    .digest('hex');

  const webhookUrl = new URL(
    '/api/webhooks/tinyfish',
    process.env.NEXT_PUBLIC_APP_URL,
  );
  webhookUrl.searchParams.set('token', webhookToken);

  const tfMonitor = await TinyFishClient.createMonitor(
    record.source_url,
    webhookUrl.toString(),
    'daily',
  );

  return Monitor.create({
    record_id: record._id,
    tinyfish_monitor_id: tfMonitor.id,
    source_url: record.source_url,
    schedule: 'daily',
    monitoring_status: 'active',
    webhook_token_hash: webhookTokenHash,
  });
}

function dateOrUndefined(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function markProcessed(eventId: string) {
  await WebhookEvent.updateOne(
    { event_id: eventId },
    {
      processing_status: 'processed',
      processed_at: new Date(),
    },
  );
}

export async function processWebhook(payload: any, eventId: string) {
  if (await WebhookEvent.findOne({ event_id: eventId })) return;

  const monitorId = payload.fetch_monitor_id;
  await WebhookEvent.create({
    event_id: eventId,
    monitor_id: monitorId,
    event_payload: payload,
    processing_status: 'pending',
  });

  const monitor = await Monitor.findOne({
    tinyfish_monitor_id: monitorId,
    monitoring_status: 'active',
  });

  if (!monitor) {
    await markProcessed(eventId);
    return;
  }

  const record = await Record.findById(monitor.record_id);
  const pageText = payload.results?.[0]?.text;

  if (!record || typeof pageText !== 'string' || !pageText.trim()) {
    monitor.last_checked_at = new Date();
    await monitor.save();
    await markProcessed(eventId);
    return;
  }

  const contentHash = crypto
    .createHash('sha256')
    .update(pageText)
    .digest('hex');

  if (monitor.last_content_hash === contentHash) {
    monitor.last_checked_at = new Date();
    await monitor.save();
    await markProcessed(eventId);
    return;
  }

  const current = await TinyFishClient.agent(
    `Re-check this official registry record after a page change. Existing record name: ${record.name}. Existing registration number: ${record.registration_number || 'unknown'}. Return one structured match with name, status, original_status, registration_number, source_url, expiry_date, registration_date, disciplinary_actions, and restrictions. Use only the official registry. Do not guess missing values.`,
    record.source_url,
  );

  const newData = current.data.matches?.[0];

  monitor.last_content_hash = contentHash;
  monitor.last_checked_at = new Date();

  if (!newData) {
    await monitor.save();
    await markProcessed(eventId);
    return;
  }

  const changeSummary = detectMeaningfulChange(record, newData);

  if (changeSummary) {
    await VerificationHistory.create({
      record_id: record._id,
      previous_status: record.status,
      new_status: newData.status || record.status,
      previous_data: record.toObject(),
      new_data: newData,
      source_url: monitor.source_url,
      change_summary: changeSummary,
    });

    await createAlert(
      record._id,
      record.status,
      newData.status || record.status,
      changeSummary,
      monitor.source_url,
    );

    if (newData.status) record.status = newData.status as typeof record.status;
    if (newData.original_status) record.original_status = newData.original_status;
    if (newData.registration_number) record.registration_number = newData.registration_number;
    if (newData.expiry_date) record.expiry_date = dateOrUndefined(newData.expiry_date);
    if (newData.registration_date) record.registration_date = dateOrUndefined(newData.registration_date);
    if (newData.disciplinary_actions) record.disciplinary_actions = newData.disciplinary_actions;
    if (newData.restrictions) record.restrictions = newData.restrictions;

    record.checked_at = new Date();
    await record.save();
  }

  await monitor.save();
  await markProcessed(eventId);
}
