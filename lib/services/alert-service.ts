import Alert from '@/models/Alert';

export async function createAlert(recordId: string, previousValue: string, newValue: string, message: string, sourceUrl: string) {
  return await Alert.create({
    record_id: recordId,
    alert_type: 'STATUS_CHANGE',
    previous_value: previousValue,
    new_value: newValue,
    message: message,
    source_url: sourceUrl
  });
}
