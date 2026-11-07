import crypto from 'crypto';
import Monitor from '@/models/Monitor';
import Record from '@/models/Record';
import WebhookEvent from '@/models/WebhookEvent';
import VerificationHistory from '@/models/VerificationHistory';
import { TinyFishClient } from '../tinyfish/client';
import { detectMeaningfulChange } from './change-detection';
import { createAlert } from './alert-service';
import { getRegistryAdapter } from './verification-service';

export async function setupMonitor(recordId: string) {
  const record = await Record.findById(recordId);
  if (!record) throw new Error('Record not found');

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
    process.env.NEXT_PUBLIC_APP_URL
  );
  webhookUrl.searchParams.set('token', webhookToken);

  const tfMonitor = await TinyFishClient.createMonitor(
    record.source_url,
    webhookUrl.toString(),
    'daily'
  );

  return await Monitor.create({
    record_id: record._id,
    tinyfish_monitor_id: tfMonitor.id,
    webhook_token_hash: webhookTokenHash,
    source_url: record.source_url,
    schedule: 'daily',
  });
}

export async function processWebhook(payload: any, eventId: string) {
  if (!eventId) {
    throw new Error('Webhook run ID is missing.');
  }

  const existingEvent = await WebhookEvent.findOne({ event_id: eventId });
  if (existingEvent) return;

  const monitorId = payload.fetch_monitor_id;
  if (!monitorId) {
    throw new Error('Webhook monitor ID is missing.');
  }

  const monitor = await Monitor.findOne({
    tinyfish_monitor_id: monitorId,
    monitoring_status: 'active',
  });

  if (!monitor) {
    throw new Error('Active monitor not found.');
  }

  await WebhookEvent.create({
    event_id: eventId,
    monitor_id: monitorId,
    event_payload: payload,
    processing_status: 'pending',
  });

  const results = Array.isArray(payload.results) ? payload.results : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];

  if (errors.length > 0 || results.length === 0) {
    await WebhookEvent.updateOne(
      { event_id: eventId },
      { processing_status: 'failed', processed_at: new Date() }
    );
    return;
  }

  const record = await Record.findById(monitor.record_id);
  if (!record) {
    await WebhookEvent.updateOne(
      { event_id: eventId },
      { processing_status: 'failed', processed_at: new Date() }
    );
    return;
  }

  // Page Monitor's initial baseline is not a record change.
  if (payload.is_baseline === true || payload.run?.is_baseline === true) {
    monitor.last_checked_at = new Date();
    await monitor.save();

    await WebhookEvent.updateOne(
      { event_id: eventId },
      { processing_status: 'processed', processed_at: new Date() }
    );
    return;
  }

  // Re-read the exact record from its supported official registry.
  // Never use webhook page text as verified registration data.
  const adapter = getRegistryAdapter(record.jurisdiction, record.record_type);

  const result = await adapter.verify({
    name: record.name,
    record_type: record.record_type,
    jurisdiction: record.jurisdiction,
    registration_number:
      record.registration_number &&
      record.registration_number !== 'Not published'
        ? record.registration_number
        : undefined,
  });

  const newData = result.matches.find(
    match =>
      match.source_url === record.source_url &&
      match.name.toLowerCase() === record.name.toLowerCase()
  );

  if (!newData) {
    await WebhookEvent.updateOne(
      { event_id: eventId },
      { processing_status: 'failed', processed_at: new Date() }
    );
    return;
  }

  const changeSummary = detectMeaningfulChange(record, newData);

  if (changeSummary) {
    const previousStatus = record.status;
    const newStatus = newData.status || record.status;

    await VerificationHistory.create({
      record_id: record._id,
      previous_status: previousStatus,
      new_status: newStatus,
      previous_data: record.toObject(),
      new_data: newData,
      source_url: monitor.source_url,
      change_summary: changeSummary,
    });

    await createAlert(
      record._id,
      previousStatus,
      newStatus,
      changeSummary,
      monitor.source_url
    );

    if (newData.status) record.status = newData.status;
    if (newData.original_status) {
      record.original_status = newData.original_status;
    }
    if (newData.registration_number) {
      record.registration_number = newData.registration_number;
    }
    if (newData.expiry_date) record.expiry_date = newData.expiry_date;
    if (newData.registration_date) {
      record.registration_date = newData.registration_date;
    }
    if (newData.disciplinary_actions) {
      record.disciplinary_actions = newData.disciplinary_actions;
    }
    if (newData.restrictions) {
      record.restrictions = newData.restrictions;
    }

    record.checked_at = new Date();
    await record.save();
  }

  monitor.last_checked_at = new Date();
  await monitor.save();

  await WebhookEvent.updateOne(
    { event_id: eventId },
    { processing_status: 'processed', processed_at: new Date() }
  );
}
