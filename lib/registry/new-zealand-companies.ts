import { RegistryAdapter, VerificationRequest } from './registry-adapter';

export class NzCompaniesAdapter extends RegistryAdapter {
  registryName = 'New Zealand Companies Register';
  startUrl = 'https://companies-register.companiesoffice.govt.nz/';

  buildAgentPrompt(req: VerificationRequest): string {
    const hasRegistrationNumber = Boolean(req.registration_number?.trim());
    const searchTerms = [req.name, req.registration_number]
      .filter(Boolean)
      .join(' or ');

    return `Navigate to the official New Zealand Companies Register.

Search for:
"${searchTerms}"

Return every plausible matching company in a JSON array named "matches".

Matching rules:
- If a registration number or NZBN is supplied, return only the official company with that exact identifier.
- If no registration number is supplied, do not choose one company merely because its name looks similar.
- If two or more official companies could plausibly match the requested name, return all of them.
- Never select one company automatically when the name-only search is ambiguous.
- Return an empty matches array only when the official register contains no plausible match.
- A result is not unique merely because it appears first in the search results.
- Compare the exact company name, company number, NZBN, registered status, and official summary URL before deciding whether a result is unique.

For every match, provide:
- name: the company name exactly as shown on the official register
- registration_number: the company number or NZBN, if published
- status: map to active, expired, suspended, cancelled, removed, inactive, or unknown
- original_status: the exact company status text
- source_url: the specific official company summary page
- registration_date: incorporation or registration date in ISO format, if published
- expiry_date: ISO date if published
- disciplinary_actions: []
- restrictions: []

Important rules:
- Use only the official New Zealand Companies Register.
- Do not invent, infer, or guess missing information.
- Return all plausible candidates for an ambiguous name-only search.
- Return exactly one candidate only when the registration number or NZBN proves that the company is unique.
- Do not report medical disciplinary actions for companies.
- The requested name is "${req.name}".
- Registration number supplied: ${hasRegistrationNumber ? 'yes' : 'no'}.`;
  }
}
