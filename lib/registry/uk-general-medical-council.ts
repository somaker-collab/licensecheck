import { RegistryAdapter, VerificationRequest } from './registry-adapter';

export class UkGmcAdapter extends RegistryAdapter {
  registryName = 'UK General Medical Council';
  startUrl = 'https://www.gmc-uk.org/registration-and-licensing/the-medical-register';

  buildAgentPrompt(req: VerificationRequest): string {
    const searchTerms = [req.name, req.registration_number].filter(Boolean).join(' or ');
    return `Navigate to the UK GMC Medical Register. Search for: "${searchTerms}".
      Extract all matching doctors into a JSON array named "matches". For each match, provide:
      - name (Full name)
      - registration_number (GMC Reference Number)
      - status (Map to: active, expired, suspended, cancelled, removed, inactive, or unknown)
      - original_status (Exact text of registration status and licence to practise)
      - source_url (URL of their specific record page)
      - disciplinary_actions (Array of strings representing conditions/warnings)
      Return empty array if no matches.`;
  }
}
