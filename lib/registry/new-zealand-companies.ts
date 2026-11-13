import { RegistryAdapter, RegistryMatch, VerificationRequest } from './registry-adapter';
import { TinyFishClient } from '../tinyfish/client';

export class NzCompaniesAdapter extends RegistryAdapter {
  registryName = 'New Zealand Companies Register';
  startUrl = 'https://companies-register.companiesoffice.govt.nz/';

  async startAsync(req: VerificationRequest) {
    const companyNumber = req.registration_number?.trim();
    const startUrl = companyNumber && /^\d{5,7}$/.test(companyNumber)
      ? `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${encodeURIComponent(companyNumber)}`
      : `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/search?mode=standard&type=entities&q=${encodeURIComponent(req.name.trim())}&advancedPanel=true&entityTypes=ALL`;
    return TinyFishClient.startAgent(this.buildAgentPrompt(req), startUrl);
  }

  async fastVerify(req: VerificationRequest): Promise<RegistryMatch[] | null> {
    const companyNumber = req.registration_number?.trim();
    if (!companyNumber && !req.name.trim()) return null;
    const sourceUrl = companyNumber && /^\d{5,7}$/.test(companyNumber)
      ? `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${encodeURIComponent(companyNumber)}`
      : `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/search?mode=standard&type=entities&q=${encodeURIComponent(req.name.trim())}&advancedPanel=true&entityTypes=ALL`;
    try {
      const fetched = await TinyFishClient.fetch(
        sourceUrl,
        companyNumber
          ? `Read the official New Zealand Companies Register page for company number ${companyNumber}. Return the complete page text without inference.`
          : `Read the official New Zealand Companies Register search results for the exact company name "${req.name}". Return every result exactly as shown, including company number and status. Do not infer or invent results.`,
      );
      const text = fetched.results?.[0]?.text?.trim() || '';
      if (!text) return null;
      if (companyNumber) {
        if (!new RegExp(`\\b${companyNumber}\\b`).test(text)) return null;
        const heading = this.firstHeading(text);
        if (!heading) return null;
        const name = heading.replace(new RegExp(`\\s*\\(${companyNumber}\\)\\s*`, 'i'), '').replace(/\s*(Registered|Removed|In liquidation|Deregistered)\s*$/i, '').trim();
        const originalStatus = this.firstLabel(text, ['Company status', 'Status']) || (/(Registered|Removed|In liquidation|Deregistered)/i.exec(heading)?.[1] || 'Status not published by the official Companies Register page');
        return [this.toMatch(name, companyNumber, originalStatus, sourceUrl)];
      }

      const results = this.parseSearchResults(text);
      if (results.length > 0) return results;
      if (!companyNumber) {
        const officialResults = await this.fetchOfficialSearchResults(sourceUrl);
        if (officialResults.length > 0) return officialResults;
      }
      if (/no (?:companies|records) (?:were )?found|couldn't find a company matching|no records matched/i.test(text)) return [];
      return null;
    } catch {
      return null;
    }
  }

  private async fetchOfficialSearchResults(sourceUrl: string): Promise<RegistryMatch[]> {
    try {
      const response = await fetch(sourceUrl, { cache: 'no-store' });
      if (!response.ok) return [];
      const html = await response.text();
      const results: RegistryMatch[] = [];
      const seen = new Set<string>();
      const entryPattern = /<span[^>]*class=["']entityName["'][^>]*>\s*([^<]+?)\s*<\/span>\s*<span[^>]*class=["']entityInfo["'][^>]*>\s*\((\d{5,7})\)([\s\S]*?)<\/span>/gi;
      for (const match of Array.from(html.matchAll(entryPattern))) {
        const name = this.cleanMarkup(match[1]);
        const registrationNumber = match[2];
        if (!name || seen.has(registrationNumber)) continue;
        const status = this.cleanMarkup(match[3]).match(/\b(Registered|Removed|In liquidation|In receivership|In voluntary administration|In statutory management|Approved)\b/i)?.[1]
          || 'Status not published by the official Companies Register search result';
        seen.add(registrationNumber);
        results.push(this.toMatch(name, registrationNumber, status, `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${encodeURIComponent(registrationNumber)}`));
      }
      return results;
    } catch {
      return [];
    }
  }

  private cleanMarkup(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  }

  private toMatch(name: string, registrationNumber: string, originalStatus: string, sourceUrl: string): RegistryMatch {
    return {
      name: name.trim(),
      registration_number: registrationNumber,
      status: this.mapStatus(originalStatus),
      original_status: originalStatus.trim(),
      source_url: sourceUrl,
      disciplinary_actions: [],
      restrictions: [],
    };
  }

  private parseSearchResults(text: string): RegistryMatch[] {
    const results: RegistryMatch[] = [];
    const seen = new Set<string>();
    const normalizedText = text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/javascript:\s*viewCompanyDetails\([^)]*\)/gi, '')
      .replace(/[);]+(?=\s*\(\d{5,7}\))/g, '')
      .replace(/[ \t]+/g, ' ');
    const lines = normalizedText.split(/\r?\n/)
      .map((line) => line.replace(/^[-*#>\s]+/, '').trim()).filter(Boolean);
    for (const line of lines) {
      const match = line.match(/(?:^|\b(?:result|results|company)\s*[:\-]?\s*)([A-Za-z0-9][A-Za-z0-9 &.'’(),/-]{2,120}?)\s*\((\d{5,7})\)(?:\s*\(NZBN:\s*\d+\))?/i);
      if (!match || seen.has(match[2])) continue;
      seen.add(match[2]);
      const status = line.slice((match.index || 0) + match[0].length).match(/\b(Registered|Removed|In liquidation|In receivership|In voluntary administration|In statutory management|Approved)\b/i)?.[1]
        || 'Status not published by the official Companies Register search result';
      results.push(this.toMatch(match[1], match[2], status, `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${encodeURIComponent(match[2])}`));
    }
    return results;
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
