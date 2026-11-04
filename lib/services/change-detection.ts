// Detects meaningful changes and ignores irrelevant HTML updates (Bounty Requirement Part 7)
export function detectMeaningfulChange(oldRecord: any, newData: any) {
  const changes: string[] = [];

  if (newData.status && newData.status !== oldRecord.status) {
    changes.push(`Status changed from ${oldRecord.status} to ${newData.status}`);
  }
  if (newData.registration_number && newData.registration_number !== oldRecord.registration_number) {
    changes.push(`Registration number updated to ${newData.registration_number}`);
  }
  if (newData.expiry_date && newData.expiry_date !== oldRecord.expiry_date) {
    changes.push(`Expiry date updated to ${newData.expiry_date}`);
  }
  
  return changes.length > 0 ? changes.join('. ') : null;
}
