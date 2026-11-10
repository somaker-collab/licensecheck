import { NepalMedicalCouncilAdapter } from '../registry/nepal-medical-council';
import { UkGmcAdapter } from '../registry/uk-general-medical-council';
import { NzCompaniesAdapter } from '../registry/new-zealand-companies';

export function getRegistryAdapter(jurisdiction: string, recordType: string) {
  if (jurisdiction === 'Nepal' && recordType === 'medical_licence') {
    return new NepalMedicalCouncilAdapter();
  } else if (jurisdiction === 'United Kingdom' && recordType === 'medical_licence') {
    return new UkGmcAdapter();
  } else if (jurisdiction === 'New Zealand' && recordType === 'company_registration') {
    return new NzCompaniesAdapter();
  }
  throw new Error('Unsupported jurisdiction or record type');
}
