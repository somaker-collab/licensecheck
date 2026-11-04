import { RegistryAdapter, VerificationRequest } from './registry-adapter';

export class NepalMedicalCouncilAdapter extends RegistryAdapter {
  registryName = 'Nepal Medical Council';
  startUrl = 'https://www.nmc.org.np/searchPractitioner';

  buildAgentPrompt(req: VerificationRequest): string {
    const searchTerms = [req.name, req.registration_number].filter(Boolean).join(' or ');
    return `Navigate to the Nepal Medical Council register. Search for: "${searchTerms}".
      Extract all matching doctors into a JSON array named "matches". For each match, provide:
      - name (Full name)
      - registration_number (NMC Number)
      - status (Map to: active, expired, suspended, cancelled, removed, inactive, or unknown)
      - original_status (Exact string from site)
      - source_url (URL of their specific record page)
      - disciplinary_actions (Array of strings, empty if none)
      Do not invent missing fields. Return empty array if no matches.`;
  }
}
