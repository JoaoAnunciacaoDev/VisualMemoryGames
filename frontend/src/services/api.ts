export interface ApiRequestConfig {
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  status?: number;
  headers?: Headers;
}

interface ApiErrorPayload {
  detail?: string | Array<{ msg?: string }>;
  message?: string;
}

export class ApiError<T = unknown> extends Error {
  response: { status: number; data: T };
  config: { url: string };

  constructor(message: string, url: string, status: number, data: T) {
    super(message);
    this.name = 'ApiError';
    this.response = { status, data };
    this.config = { url };
  }
}

export function isApiError(error: unknown): error is ApiError<ApiErrorPayload> {
  return error instanceof ApiError;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function buildUrl(path: string, params?: ApiRequestConfig['params']): string {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  return text || undefined;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  config: ApiRequestConfig = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(config.headers);
  let requestBody: FormData | URLSearchParams | string | undefined;

  if (body instanceof FormData || body instanceof URLSearchParams) {
    requestBody = body;
    if (body instanceof FormData) headers.delete('Content-Type');
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, config.params), {
    method,
    headers,
    body: requestBody,
    credentials: 'include',
    signal: config.signal,
  });
  const data = await parseBody(response);

  if (!response.ok) {
    const detail = typeof data === 'object' && data && 'detail' in data
      ? String((data as { detail?: unknown }).detail)
      : response.statusText;
    const error = new ApiError(detail || 'Erro na requisição', path, response.status, data);
    if (response.status === 401 && !path.includes('/login') && !path.includes('/users/me')) {
      window.location.href = '/login';
    }
    throw error;
  }

  return { data: data as T, status: response.status, headers: response.headers };
}

const api = {
  get: <T = unknown>(url: string, config?: ApiRequestConfig) => request<T>('GET', url, undefined, config),
  post: <T = unknown>(url: string, body?: unknown, config?: ApiRequestConfig) => request<T>('POST', url, body, config),
  put: <T = unknown>(url: string, body?: unknown, config?: ApiRequestConfig) => request<T>('PUT', url, body, config),
  patch: <T = unknown>(url: string, body?: unknown, config?: ApiRequestConfig) => request<T>('PATCH', url, body, config),
  delete: <T = unknown>(url: string, config?: ApiRequestConfig) => request<T>('DELETE', url, undefined, config),
};

export default api;
