import mongoose, { Schema, Document, models } from 'mongoose';

export interface IRecord extends Document {
  name: string;
  record_type: string;
  jurisdiction: string;
  registry: string;
  registration_number?: string;
  status: 'active' | 'expired' | 'suspended' | 'cancelled' | 'removed' | 'inactive' | 'unknown';
  original_status: string;
  expiry_date?: Date;
  registration_date?: Date;
  disciplinary_actions: string[];
  restrictions: string[];
  source_url: string;
  match_confidence: 'confirmed' | 'probable' | 'uncertain';
  verification_outcome: 'verified' | 'not_found' | 'error';
  checked_at: Date;
}

const RecordSchema = new Schema<IRecord>({
  name: { type: String, required: true },
  record_type: { type: String, required: true },
  jurisdiction: { type: String, required: true },
  registry: { type: String, required: true },
  registration_number: String,
  status: { type: String, required: true },
  original_status: { type: String, required: true },
  expiry_date: Date,
  registration_date: Date,
  disciplinary_actions: [String],
  restrictions: [String],
  source_url: { type: String, required: true },
  match_confidence: String,
  verification_outcome: String,
  checked_at: { type: Date, default: Date.now },
}, { timestamps: true });

export default models.Record || mongoose.model<IRecord>('Record', RecordSchema);
