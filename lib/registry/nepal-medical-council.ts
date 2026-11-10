import { RegistryAdapter, RegistryMatch, VerificationRequest } from './registry-adapter';
import { TinyFishClient, TinyFishMatch } from '../tinyfish/client';

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

  async corroborate(matches: TinyFishMatch[], req?: VerificationRequest): Promise<RegistryMatch[]> {
    if (req) {
      const searchUrl = new URL(this.startUrl);
      if (req.name.trim()) searchUrl.searchParams.set('name', req.name.trim());
      if (req.registration_number?.trim()) {
        searchUrl.searchParams.set('nmc_no', req.registration_number.trim());
      }

      try {
        const fetched = await TinyFishClient.fetch(
          searchUrl.toString(),
          `Extract every practitioner row returned by the official Nepal Medical Council search for ${req.name}${req.registration_number ? ` and NMC number ${req.registration_number}` : ''}. Preserve the published name, NMC number, address, gender, and degree. Do not infer status or any unpublished field.`,
        );
        const text = fetched.results?.[0]?.text || '';
        const parsed = this.parseOfficialRows(text, searchUrl.toString());
        if (parsed.length > 0 || text.includes('Please enter Doctor Name or NMC number')) {
          return parsed.filter((match) => !req.registration_number || match.registration_number === req.registration_number.trim());
        }
      } catch {
        // If Fetch is temporarily unavailable, preserve the normal Agent corroboration path.
      }
    }

    return super.corroborate(matches, req);
  }

  private parseOfficialRows(text: string, sourceUrl: string): RegistryMatch[] {
    const results: RegistryMatch[] = [];
    const rowPattern = /Full Name\s+(.+?)\s+NMC No\s+([A-Za-z0-9-]+)(.*?)(?=Full Name\s|Nepal Medical Council|$)/g;
    let match: RegExpExecArray | null;
    while ((match = rowPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const registrationNumber = match[2].trim();
      const details = match[3].trim();
      const address = details.match(/Address\s+(.+?)(?=,?\s*Gender\s|,?\s*Degree\s|$)/i)?.[1]?.trim();
      const degree = details.match(/Degree\s+(.+)$/i)?.[1]?.trim();
      const publishedDetails = [address && `Address ${address}`, degree && `Degree ${degree}`].filter(Boolean).join('; ');
      results.push({
        name,
        registration_number: registrationNumber,
        status: 'unknown',
        original_status: publishedDetails || 'Status not published by the official NMC search response',
        source_url: sourceUrl,
        disciplinary_actions: ['unavailable'],
        restrictions: [],
      });
    }

    const lines = text.split(/\r?\n/).map((line) => line.trim());
    for (let i = 0; i < lines.length; i += 1) {
      const firstField = lines[i].match(/^\|\s*Full Name\s*\|\s*(.*?)\s*\|$/i);
      if (!firstField) continue;

      const fields: Record<string, string> = { 'Full Name': firstField[1].trim() };
      for (let j = i + 1; j < Math.min(lines.length, i + 16); j += 1) {
        const field = lines[j].match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|$/);
        if (!field) continue;
        const key = field[1].trim();
        if (key === 'Full Name') break;
        if (!['---', ''].includes(key)) fields[key] = field[2].trim();
      }

      if (!fields['NMC No']) continue;
      results.push({
        name: fields['Full Name'],
        registration_number: fields['NMC No'],
        status: 'unknown',
        original_status: [
          fields.Address && `Address ${fields.Address}`,
          fields.Degree && `Degree ${fields.Degree}`,
        ].filter(Boolean).join('; ') || 'Status not published by the official NMC search response',
        source_url: sourceUrl,
        disciplinary_actions: ['unavailable'],
        restrictions: [],
      });
    }

    return results;
  }
}
