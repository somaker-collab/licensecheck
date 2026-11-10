import mongoose, { Schema, models } from 'mongoose';

const HistorySchema = new Schema({
  record_id: { type: Schema.Types.ObjectId, ref: 'Record', required: true },
  previous_status: String,
  new_status: String,
  previous_data: Schema.Types.Mixed,
  new_data: Schema.Types.Mixed,
  source_url: String,
  change_summary: String,
  checked_at: { type: Date, default: Date.now },
});

export default models.VerificationHistory || mongoose.model('VerificationHistory', HistorySchema);
