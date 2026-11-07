import { TinyFishClient, TinyFishMatch } from '../tinyfish/client';

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

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toRegistryMatch(match: TinyFishMatch): RegistryMatch {
  return { ...match, expiry_date: toDate(match.expiry_date), registration_date: toDate(match.registration_date) };
}

export abstract class RegistryAdapter {
  abstract registryName: string;
  abstract startUrl: string;
  abstract buildAgentPrompt(req: VerificationRequest): string;

  async verify(req: VerificationRequest): Promise<VerificationResult> {
    const response = await TinyFishClient.agent(this.buildAgentPrompt(req), this.startUrl);
    const verifiedMatches: RegistryMatch[] = [];
    for (const match of response.data.matches || []) {
      if (!match.source_url) continue;
      const fetched = await TinyFishClient.fetch(match.source_url, `Confirm that this official registry page contains the record for ${match.name}. Do not infer or invent information.`);
      if (!fetched.results?.[0]?.text?.trim()) continue;
      verifiedMatches.push(toRegistryMatch(match));
    }
    return { matches: verifiedMatches, registryName: this.registryName };
  }
}
