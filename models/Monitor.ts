import mongoose, { Schema, Document, models } from 'mongoose';

export interface IMonitor extends Document {
  record_id: mongoose.Types.ObjectId;
  tinyfish_monitor_id: string;
  webhook_token_hash?: string;
  source_url: string;
  schedule: string;
  monitoring_status: 'active' | 'paused' | 'stopped';
  last_checked_at?: Date;
}

const MonitorSchema = new Schema<IMonitor>({
  record_id: { type: Schema.Types.ObjectId, ref: 'Record', required: true },
  webhook_token_hash: { type: String },
  tinyfish_monitor_id: { type: String, required: true, unique: true },
  source_url: { type: String, required: true },
  schedule: { type: String, default: 'daily' },
  monitoring_status: { type: String, default: 'active' },
  last_checked_at: Date,
}, { timestamps: true });

export default models.Monitor || mongoose.model<IMonitor>('Monitor', MonitorSchema);
