import { RegistryAdapter, VerificationRequest } from './registry-adapter';

export class UkGmcAdapter extends RegistryAdapter {
  registryName = 'UK General Medical Council';
  startUrl = 'https://www.gmc-uk.org/registration-and-licensing/the-medical-register';

  buildAgentPrompt(req: VerificationRequest): string {
    const hasRegistrationNumber = Boolean(req.registration_number?.trim());
    const searchTerms = [req.name, req.registration_number]
      .filter(Boolean)
      .join(' or ');

    return `Navigate to the official UK General Medical Council Medical Register.

Search for:
"${searchTerms}"

Return every plausible matching doctor in a JSON array named "matches".

Matching rules:
- If a registration number is supplied, return only the official record with that exact GMC reference number.
- If no registration number is supplied, do not choose one doctor merely because the name looks similar.
- If two or more official records could plausibly match the requested name, return all of them.
- When multiple plausible records exist, never select a single record automatically.
- Return an empty matches array only when the official register contains no plausible match.
- A result is not unique merely because one candidate appears first in search results.
- Compare full name, registration number, profile URL, and registration status before deciding whether a result is unique.

For every match, provide:
- name: the full name exactly as shown by the GMC
- registration_number: the GMC reference number, if published
- status: map to active, expired, suspended, cancelled, removed, inactive, or unknown
- original_status: the exact registration and licence-to-practise wording
- source_url: the specific official GMC profile URL
- expiry_date: ISO date if published
- registration_date: ISO date if published
- disciplinary_actions: only explicitly published conditions, warnings, restrictions, or other actions
- restrictions: only explicitly published restrictions

Important rules:
- Use only the official UK GMC register.
- Do not invent, infer, or guess missing information.
- Do not describe unavailable disciplinary information as no disciplinary action.
- If disciplinary information is not published or cannot be determined, return ["unavailable"].
- Return all plausible candidates for an ambiguous name-only search.
- Return exactly one candidate only when the registration number proves that the record is unique.
- The requested name is "${req.name}".
- Registration number supplied: ${hasRegistrationNumber ? 'yes' : 'no'}.`;
  }
}
