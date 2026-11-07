
import { RegistryAdapter, VerificationRequest } from './registry-adapter';

export class NzCompaniesAdapter extends RegistryAdapter {
  registryName = 'New Zealand Companies Register';
  startUrl = 'https://companies-register.companiesoffice.govt.nz/';

  buildAgentPrompt(req: VerificationRequest): string {
    const searchTerms = [req.name, req.registration_number]
      .filter(Boolean)
      .join(' or ');

    return `Navigate to the New Zealand Companies Register. Search for: "${searchTerms}".

      Extract all matching companies into a JSON array named "matches".

      For each match, provide:
      - name (Company name as shown on the official register)
      - registration_number (Company number or NZBN, if published)
      - status (Map to: active, expired, suspended, cancelled, removed, inactive, or unknown)
      - original_status (Exact company status text)
      - source_url (URL of the specific official company summary page)
      - registration_date (Incorporation or registration date, if published, in ISO format)

      Important rules:
      - Do not invent or guess missing information.
      - Return an empty matches array only when no matching company is found.
      - Use only information from the official New Zealand Companies Register.
      - Do not report medical disciplinary actions for companies.`;
  }
}
