import mongoose, { Schema, Document, models } from 'mongoose';

export interface IMonitor extends Document {
  record_id: mongoose.Types.ObjectId;
  tinyfish_monitor_id: string;
  source_url: string;
  schedule: string;
  monitoring_status: 'active' | 'paused' | 'stopped';
  last_checked_at?: Date;
  last_content_hash?: string;
  webhook_token_hash: string;
}

const MonitorSchema = new Schema<IMonitor>({
  record_id: { type: Schema.Types.ObjectId, ref: 'Record', required: true },
  tinyfish_monitor_id: { type: String, required: true, unique: true },
  source_url: { type: String, required: true },
  schedule: { type: String, default: 'daily' },
  monitoring_status: { type: String, default: 'active' },
  last_checked_at: Date,
  last_content_hash: String,
  webhook_token_hash: { type: String, required: true, select: false },
}, { timestamps: true });

export default models.Monitor || mongoose.model<IMonitor>('Monitor', MonitorSchema);
