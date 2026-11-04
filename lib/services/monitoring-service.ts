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

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/tinyfish`;
  const tfMonitor = await createTinyFishMonitor(record.source_url, webhookUrl, 'daily');

  return await Monitor.create({
    record_id: record._id,
    tinyfish_monitor_id: tfMonitor.id || `tf_monitor_${Date.now()}`,
    source_url: record.source_url,
    schedule: 'daily',
  });
}

export async function processWebhook(payload: any, eventId: string) {
  const existingEvent = await WebhookEvent.findOne({ event_id: eventId });
  if (existingEvent) return;

  await WebhookEvent.create({ event_id: eventId, monitor_id: payload.monitor_id, event_payload: payload });

  const monitor = await Monitor.findOne({ tinyfish_monitor_id: payload.monitor_id });
  if (!monitor) return;

  const record = await Record.findById(monitor.record_id);
  const newData = payload.extracted_data; 
  if (!newData) return; 

  const changeSummary = detectMeaningfulChange(record, newData);

  if (changeSummary) {
    await VerificationHistory.create({
      record_id: record._id,
      previous_status: record.status,
      new_status: newData.status || record.status,
      previous_data: record.toObject(),
      new_data: newData,
      source_url: monitor.source_url,
      change_summary: changeSummary
    });

    await createAlert(record._id, record.status, newData.status || record.status, changeSummary, monitor.source_url);

    if (newData.status) record.status = newData.status;
    if (newData.original_status) record.original_status = newData.original_status;
    record.checked_at = new Date();
    await record.save();
  }

  monitor.last_checked_at = new Date();
  await monitor.save();
}
