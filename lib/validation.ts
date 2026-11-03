// Basic input sanitization to prevent injection vulnerabilities (Bounty Requirement Part 11)
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input.replace(/[<>{}$]/g, '').trim();
}

export function validateVerificationRequest(data: any) {
  if (!data.name || typeof data.name !== 'string') throw new Error('Valid name is required');
  if (!data.record_type) throw new Error('Record type is required');
  if (!data.jurisdiction) throw new Error('Jurisdiction is required');
  
  return {
    name: sanitizeInput(data.name),
    record_type: sanitizeInput(data.record_type),
    jurisdiction: sanitizeInput(data.jurisdiction),
    registration_number: data.registration_number ? sanitizeInput(data.registration_number) : undefined
  };
}
