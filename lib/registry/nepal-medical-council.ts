
import { RegistryAdapter, VerificationRequest } from './registry-adapter';

export class NepalMedicalCouncilAdapter extends RegistryAdapter {
  registryName = 'Nepal Medical Council';
  startUrl = 'https://www.nmc.org.np/searchPractitioner';

  buildAgentPrompt(req: VerificationRequest): string {
    const searchTerms = [req.name, req.registration_number]
      .filter(Boolean)
      .join(' or ');

    return `Navigate to the Nepal Medical Council register. Search for: "${searchTerms}".

      Extract all matching doctors into a JSON array named "matches".

      For each match, provide:
      - name (Full name as shown on the official register)
      - registration_number (NMC registration number, if published)
      - status (Map to: active, expired, suspended, cancelled, removed, inactive, or unknown)
      - original_status (Exact status wording from the official site)
      - source_url (URL of the specific official record page)
      - expiry_date (Expiry date, if published, in ISO format)
      - registration_date (Registration date, if published, in ISO format)
      - disciplinary_actions (List actions only when explicitly published on the official record)

      Important rules:
      - Do not invent or guess missing information.
      - Do not treat an unpublished disciplinary section as proof that there are no disciplinary actions.
      - If disciplinary information is not published or cannot be determined, represent it as unavailable, not as an empty list.
      - Return an empty matches array only when no matching doctor is found.
      - Use only information from the official Nepal Medical Council register.`;
  }
}
