import { TinyFishClient, TinyFishMatch } from '../tinyfish/client';

export interface VerificationRequest { name: string; record_type: string; jurisdiction: string; registration_number?: string; }
export interface RegistryMatch { name: string; status: string; original_status: string; registration_number?: string; source_url: string; expiry_date?: Date; registration_date?: Date; disciplinary_actions?: string[]; restrictions?: string[]; }
export interface VerificationResult { matches: RegistryMatch[]; registryName: string; }

function toDate(value?: string) { if (!value) return undefined; const date = new Date(value); return Number.isNaN(date.getTime()) ? undefined : date; }
function toRegistryMatch(match: TinyFishMatch): RegistryMatch { return { ...match, expiry_date: toDate(match.expiry_date), registration_date: toDate(match.registration_date) }; }

export abstract class RegistryAdapter {
  abstract registryName: string;
  abstract startUrl: string;
  abstract buildAgentPrompt(req: VerificationRequest): string;

  async startAsync(req: VerificationRequest) {
    return TinyFishClient.startAgent(this.buildAgentPrompt(req), this.startUrl);
  }

  async corroborate(matches: TinyFishMatch[]): Promise<RegistryMatch[]> {
    const verified: RegistryMatch[] = [];
    for (const match of matches || []) {
      if (!match.source_url) continue;
      const fetched = await TinyFishClient.fetch(match.source_url, `Confirm that this official registry page contains the record for ${match.name}. Do not infer or invent information.`);
      if (fetched.results?.[0]?.text?.trim()) verified.push(toRegistryMatch(match));
    }
    return verified;
  }

  async verify(req: VerificationRequest): Promise<VerificationResult> {
    const { runId } = await this.startAsync(req);
    let run = await TinyFishClient.getRun(runId);
    const deadline = Date.now() + 150000;
    while (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      run = await TinyFishClient.getRun(runId);
    }
    if (run.status !== 'COMPLETED') throw new Error(run.error?.message || `TinyFish Agent ended with status ${run.status}.`);
    return { matches: await this.corroborate(run.result?.matches || []), registryName: this.registryName };
  }
}
