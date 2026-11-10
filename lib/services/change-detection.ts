
function normalizeDate(value: unknown): string | null {
  if (!value) return null;

  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toISOString().slice(0, 10);
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().toLowerCase())
    .sort();
}

export function detectMeaningfulChange(oldRecord: any, newData: any) {
  if (!oldRecord || !newData) return null;

  const changes: string[] = [];

  if (newData.status && newData.status !== oldRecord.status) {
    changes.push(
      `Status changed from ${oldRecord.status} to ${newData.status}`
    );
  }

  if (
    newData.original_status &&
    newData.original_status !== oldRecord.original_status
  ) {
    changes.push('Original registry status wording changed');
  }

  if (
    newData.registration_number &&
    newData.registration_number !== oldRecord.registration_number
  ) {
    changes.push('Registration number changed');
  }

  if (
    newData.expiry_date &&
    normalizeDate(newData.expiry_date) !== normalizeDate(oldRecord.expiry_date)
  ) {
    changes.push('Expiry date changed');
  }

  if (
    newData.registration_date &&
    normalizeDate(newData.registration_date) !== normalizeDate(oldRecord.registration_date)
  ) {
    changes.push('Registration date changed');
  }

  if (
    newData.disciplinary_actions &&
    JSON.stringify(normalizeList(newData.disciplinary_actions)) !==
      JSON.stringify(normalizeList(oldRecord.disciplinary_actions))
  ) {
    changes.push('Disciplinary information changed');
  }

  if (
    newData.restrictions &&
    JSON.stringify(normalizeList(newData.restrictions)) !==
      JSON.stringify(normalizeList(oldRecord.restrictions))
  ) {
    changes.push('Registration restrictions changed');
  }

  return changes.length > 0 ? changes.join('. ') : null;
}
