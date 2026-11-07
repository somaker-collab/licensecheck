import { TinyFishClient } from '../tinyfish/client';

export interface VerificationRequest {
  name: string;
  record_type: string;
  jurisdiction: string;
  registration_number?: string;
}

export interface RegistryMatch {
  name: string;
  status: string;
  original_status: string;
  registration_number?: string;
  source_url: string;
  expiry_date?: Date;
  registration_date?: Date;
  disciplinary_actions?: string[];
  restrictions?: string[];
}

export interface VerificationResult {
  matches: RegistryMatch[];
  registryName: string;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isOfficialRegistryUrl(sourceUrl: string, startUrl: string): boolean {
  try {
    const source = new URL(sourceUrl);
    const official = new URL(startUrl);

    return (
      source.protocol === 'https:' &&
      (source.hostname === official.hostname ||
        source.hostname.endsWith(`.${official.hostname}`))
    );
  } catch {
    return false;
  }
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export abstract class RegistryAdapter {
  abstract registryName: string;
  abstract startUrl: string;
  abstract buildAgentPrompt(req: VerificationRequest): string;

  async verify(req: VerificationRequest): Promise<VerificationResult> {
    const prompt = this.buildAgentPrompt(req);
    const response = await TinyFishClient.agent(prompt, this.startUrl);
    const agentMatches = response.data?.matches || [];

    const verifiedMatches: RegistryMatch[] = [];

    for (const match of agentMatches) {
      if (!isOfficialRegistryUrl(match.source_url, this.startUrl)) {
        throw new Error('Registry returned a source URL outside the official registry.');
      }

      const fetched = await TinyFishClient.fetch(
        match.source_url,
        'Confirm this exact record. Check the full name, registration number if published, and exact registration status.'
      );

      const page = fetched.results?.find(
        result => result.text && result.final_url
      );

      if (!page || !page.text) {
        throw new Error('Official registry page could not be fetched. Result is unverified.');
      }

      if (!isOfficialRegistryUrl(page.final_url, this.startUrl)) {
        throw new Error('Fetched page redirected outside the official registry.');
      }

      const pageText = normalize(page.text);

      if (!pageText.includes(normalize(match.name))) {
        throw new Error('Official page did not confirm the registered name.');
      }

      if (
        req.registration_number &&
        !pageText.includes(normalize(req.registration_number))
      ) {
        throw new Error('Official page did not confirm the supplied registration number.');
      }

      if (!pageText.includes(normalize(match.original_status))) {
        throw new Error('Official page did not confirm the original registration status.');
      }

      verifiedMatches.push({
        ...match,
        expiry_date: toDate(match.expiry_date),
        registration_date: toDate(match.registration_date),
      });
    }

    return {
      matches: verifiedMatches,
      registryName: this.registryName,
    };
  }
}
