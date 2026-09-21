import { isApiError } from '@/services/api';

interface ValidationDetail {
  msg?: string;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: ValidationDetail) => item.msg)
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) return messages.join('\n');
  }
  const responseMessage = error.response?.data?.message;
  if (typeof responseMessage === 'string') return responseMessage;
  return error.message || fallback;
}
