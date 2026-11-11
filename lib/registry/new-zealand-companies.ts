import { RegistryAdapter, RegistryMatch, VerificationRequest } from './registry-adapter';
import { TinyFishClient } from '../tinyfish/client';

export class NzCompaniesAdapter extends RegistryAdapter {
  registryName = 'New Zealand Companies Register';
  startUrl = 'https://companies-register.companiesoffice.govt.nz/';

  async fastVerify(req: VerificationRequest): Promise<RegistryMatch[] | null> {
    const companyNumber = req.registration_number?.trim();
    if (!companyNumber || !/^\d{5,7}$/.test(companyNumber)) return null;
    const sourceUrl = `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${encodeURIComponent(companyNumber)}`;
    try {
      const fetched = await TinyFishClient.fetch(
        sourceUrl,
        `Read the official New Zealand Companies Register page for company number ${companyNumber}. Return the complete page text without inference.`,
      );
      const text = fetched.results?.[0]?.text?.trim() || '';
      if (!text || !new RegExp(`\\b${companyNumber}\\b`).test(text)) return null;
      const heading = this.firstHeading(text);
      if (!heading) return null;
      const name = heading.replace(new RegExp(`\\s*\\(${companyNumber}\\)\\s*`, 'i'), '').replace(/\s+(Registered|Removed|In liquidation|Deregistered)\s*$/i, '').trim();
      const originalStatus = this.firstLabel(text, ['Company status', 'Status']) || (/(Registered|Removed|In liquidation|Deregistered)/i.exec(heading)?.[1] || 'Status not published by the official Companies Register page');
      return [{
        name,
        registration_number: companyNumber,
        status: this.mapStatus(originalStatus),
        original_status: originalStatus,
        source_url: sourceUrl,
        disciplinary_actions: [],
        restrictions: [],
      }];
    } catch {
      return null;
    }
  }

  private firstLabel(text: string, labels: string[]): string | undefined {
    for (const label of labels) {
      const match = text.match(new RegExp(`${label}\\s*[:|]?\\s*([^\\n|]+)`, 'i'));
      if (match?.[1]?.trim()) return match[1].trim();
    }
    return undefined;
  }

  private firstHeading(text: string): string | undefined {
    return text.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, '').trim()).find((line) => line.length > 2);
  }

  private mapStatus(value: string): string {
    const normalized = value.toLowerCase();
    if (normalized.includes('remove')) return 'removed';
    if (normalized.includes('cancel')) return 'cancelled';
    if (normalized.includes('inactive')) return 'inactive';
    if (normalized.includes('active') || normalized.includes('registered')) return 'active';
    return 'unknown';
  }

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
