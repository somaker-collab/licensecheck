import mongoose, { Schema, models } from 'mongoose';

const AlertSchema = new Schema({
  record_id: { type: Schema.Types.ObjectId, ref: 'Record', required: true },
  alert_type: { type: String, required: true },
  previous_value: String,
  new_value: String,
  message: String,
  source_url: String,
  read_status: { type: Boolean, default: false },
  detected_at: { type: Date, default: Date.now },
});

export default models.Alert || mongoose.model('Alert', AlertSchema);
