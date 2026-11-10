import { RegistryAdapter, VerificationRequest } from './registry-adapter';
import { TinyFishClient } from '../tinyfish/client';

export class NepalMedicalCouncilAdapter extends RegistryAdapter {
  registryName = 'Nepal Medical Council';
  startUrl = 'https://www.nmc.org.np/searchPractitioner';

  async startAsync(req: VerificationRequest) {
    const searchUrl = new URL(this.startUrl);
    if (req.name.trim()) searchUrl.searchParams.set('name', req.name.trim());
    if (req.registration_number?.trim()) {
      searchUrl.searchParams.set('nmc_no', req.registration_number.trim());
    }

    return TinyFishClient.startAgent(this.buildAgentPrompt(req), searchUrl.toString());
  }

  buildAgentPrompt(req: VerificationRequest): string {
    const hasRegistrationNumber = Boolean(req.registration_number?.trim());
    const searchTerms = [req.name, req.registration_number]
      .filter(Boolean)
      .join(' or ');

    return `Open the official Nepal Medical Council search results URL first:
https://www.nmc.org.np/searchPractitioner?name=${encodeURIComponent(req.name.trim())}${req.registration_number?.trim() ? `&nmc_no=${encodeURIComponent(req.registration_number.trim())}` : ''}

The page may contain many results across multiple pages. Read the result list and pagination rather than selecting the first visible row.

Search for:
"${searchTerms}"

Return every plausible matching doctor in a JSON array named "matches".

Matching rules:
- If a registration number is supplied, return only the official record with that exact NMC registration number.
- If no registration number is supplied, do not choose one doctor merely because the name looks similar.
- If two or more official records could plausibly match the requested name, return all of them.
- Never select one candidate automatically when the name-only search is ambiguous.
- Return an empty matches array only when the official NMC register contains no plausible match.
- A result is not unique merely because it appears first in the search results.
- Compare the full name, registration number, profile details, and registration status before deciding whether a result is unique.

For every match, provide:
- name: the full name exactly as shown by the NMC
- registration_number: the NMC registration number, if published
- status: map to active, expired, suspended, cancelled, removed, inactive, or unknown
- original_status: the exact status wording from the official NMC site
- source_url: the specific official NMC record URL, if available
- expiry_date: ISO date if published
- registration_date: ISO date if published
- disciplinary_actions: only explicitly published actions
- restrictions: only explicitly published restrictions

Important rules:
- Use only the official Nepal Medical Council register.
- Do not invent, infer, or guess missing information.
- Do not treat an unpublished disciplinary section as proof that there are no disciplinary actions.
- If disciplinary information is not published or cannot be determined, return ["unavailable"].
- Return all plausible candidates for an ambiguous name-only search.
- Return exactly one candidate only when the registration number proves that the record is unique.
- The requested name is "${req.name}".
- Registration number supplied: ${hasRegistrationNumber ? 'yes' : 'no'}.`;
  }
}
