import { RegistryAdapter, RegistryMatch, VerificationRequest } from './registry-adapter';
import { TinyFishClient } from '../tinyfish/client';

export class NzCompaniesAdapter extends RegistryAdapter {
  registryName = 'New Zealand Companies Register';
  startUrl = 'https://companies-register.companiesoffice.govt.nz/';

  async fastVerify(req: VerificationRequest): Promise<RegistryMatch[] | null> {
    const companyNumber = req.registration_number?.trim();
    const isExact = Boolean(companyNumber && /^\d{5,7}$/.test(companyNumber));
    const sourceUrl = isExact
      ? `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${encodeURIComponent(companyNumber as string)}`
      : this.buildSearchUrl(req.name);
    try {
      const fetched = await TinyFishClient.fetch(
        sourceUrl,
        isExact
          ? `Read the official New Zealand Companies Register page for company number ${companyNumber}. Return the complete page text without inference.`
          : `Read the complete official New Zealand Companies Register name-search results for ${req.name}. Preserve every company result, official company URL, company number, exact name, and published status. Do not select only the first result and do not infer missing values.`,
      );
      const text = fetched.results?.[0]?.text?.trim() || '';
      if (!text) return null;
      if (isExact) {
        if (!new RegExp(`\\b${companyNumber}\\b`).test(text)) return null;
        const heading = this.firstHeading(text);
        if (!heading) return null;
        const name = heading.replace(new RegExp(`\\s*\\(${companyNumber}\\)\\s*`, 'i'), '').replace(/\s*(Registered|Removed|In liquidation|Deregistered)\s*$/i, '').trim();
        const originalStatus = this.firstLabel(text, ['Company status', 'Status']) || (/(Registered|Removed|In liquidation|Deregistered)/i.exec(heading)?.[1] || 'Status not published by the official Companies Register page');
        return [this.toMatch(name, companyNumber as string, originalStatus, sourceUrl)];
      }

      if (/no companies found|no results|could not find a company/i.test(text)) return [];
      const matches = this.parseSearchResults(text);
      return matches.length > 0 && !this.hasUnparsedPagination(text) ? matches : null;
    } catch {
      return null;
    }
  }

  private buildSearchUrl(name: string): string {
    const params = new URLSearchParams();
    params.set('q', name.trim());
    ['LTD', 'UNLTD', 'COOP', 'ASIC', 'NON_ASIC'].forEach((value) => params.append('entityTypes', value));
    ['REGISTERED', 'EXTERNAL_ADMINISTRATION', 'REMOVED'].forEach((value) => params.append('entityStatusGroups', value));
    params.set('mode', 'standard');
    params.set('expandedResults', '');
    params.set('start', '0');
    params.set('limit', '100');
    return `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/search?${params.toString()}#results`;
  }

  private parseSearchResults(text: string): RegistryMatch[] {
    const results: RegistryMatch[] = [];
    const pattern = /(?:\[([^\]]{2,160})\]\()?https?:\/\/app\.companiesoffice\.govt\.nz\/companies\/app\/ui\/pages\/companies\/(\d{5,7})[^\s)"']*/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const registrationNumber = match[2];
      const name = (match[1] || this.nearbyName(text, match.index)).replace(/\s+/g, ' ').trim();
      if (!name || /^search$/i.test(name) || results.some((item) => item.registration_number === registrationNumber)) continue;
      const status = this.nearbyStatus(text, match.index);
      results.push(this.toMatch(name, registrationNumber, status, `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${registrationNumber}`));
    }
    return results;
  }

  private nearbyName(text: string, index: number): string {
    return text.slice(Math.max(0, index - 180), index).split(/\n|\|/).pop() || '';
  }

  private nearbyStatus(text: string, index: number): string {
    return /(Registered|Removed|In liquidation|Deregistered|External administration)/i.exec(text.slice(index, index + 220))?.[1] || 'Status not published by the official search response';
  }

  private hasUnparsedPagination(text: string): boolean {
    return /(?:next page|showing results \d+\s*(?:to|-))|page\s+2/i.test(text);
  }

  private toMatch(name: string, registrationNumber: string, originalStatus: string, sourceUrl: string): RegistryMatch {
    return { name, registration_number: registrationNumber, status: this.mapStatus(originalStatus), original_status: originalStatus, source_url: sourceUrl, disciplinary_actions: [], restrictions: [] };
  }

  private firstLabel(text: string, labels: string[]): string | undefined {
    for (const label of labels) {
      const match = text.match(new RegExp(`${label}\\s*[:|]?\\s*([^\\n|]+)`, 'i'));
      if (match?.[1]?.trim()) return match[1].trim();
    }
    return undefined;
  }

  private firstHeading(text: string): string | undefined {
    const lines = text.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, '').trim()).filter((line) => line.length > 2);
    return lines.find((line) => /\(\d{5,7}\)/.test(line)) || lines.find((line) => /Registered|Removed|Deregistered|In liquidation/i.test(line));
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
