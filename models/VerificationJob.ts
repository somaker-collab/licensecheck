import mongoose, { Schema, models } from 'mongoose';

const VerificationJobSchema = new Schema({
  run_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  registration_number: String,
  record_type: { type: String, required: true },
  jurisdiction: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  error: String,
  result: Schema.Types.Mixed,
}, { timestamps: true });

export default models.VerificationJob || mongoose.model('VerificationJob', VerificationJobSchema);
