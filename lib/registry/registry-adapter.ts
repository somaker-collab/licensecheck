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

export abstract class RegistryAdapter {
  abstract registryName: string;
  abstract startUrl: string;
  abstract buildAgentPrompt(req: VerificationRequest): string;
  
  async verify(req: VerificationRequest): Promise<VerificationResult> {
    const prompt = this.buildAgentPrompt(req);
    // Use TinyFish Agent to navigate the registry and extract matches
    const response = await TinyFishClient.agent(prompt, this.startUrl);
    
    // Fallback parsing (assuming TinyFish agent returns structured JSON in 'data')
    const matches = response.data?.matches || [];
    return { matches, registryName: this.registryName };
  }
}
