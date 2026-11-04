import { RegistryAdapter, VerificationRequest } from './registry-adapter';

export class NzCompaniesAdapter extends RegistryAdapter {
  registryName = 'New Zealand Companies Register';
  startUrl = 'https://companies-register.companiesoffice.govt.nz/';

  buildAgentPrompt(req: VerificationRequest): string {
    const searchTerms = [req.name, req.registration_number].filter(Boolean).join(' or ');
    return `Navigate to the New Zealand Companies Register. Search for: "${searchTerms}".
      Extract all matching companies into a JSON array named "matches". For each match, provide:
      - name (Company name)
      - registration_number (Company number or NZBN)
      - status (Map to: active, expired, suspended, cancelled, removed, inactive, or unknown)
      - original_status (Exact company status text)
      - source_url (URL of their specific company summary page)
      Return empty array if no matches.`;
  }
}
