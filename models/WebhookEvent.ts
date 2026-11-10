import mongoose, { Schema, models } from 'mongoose';

const WebhookSchema = new Schema({
  event_id: { type: String, required: true, unique: true },
  monitor_id: String,
  event_payload: Schema.Types.Mixed,
  processing_status: { type: String, default: 'pending' },
  received_at: { type: Date, default: Date.now },
  processed_at: Date,
});

export default models.WebhookEvent || mongoose.model('WebhookEvent', WebhookSchema);
