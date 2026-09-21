import api, { type ApiRequestConfig } from '@/services/api';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGES = 100;

export async function fetchAllPages<T>(
  url: string,
  config?: ApiRequestConfig,
): Promise<T[]> {
  const firstResponse = config
    ? await api.get<T[]>(url, config)
    : await api.get<T[]>(url);
  const items = [...firstResponse.data];
  let page = 1;
  let lastPageSize = firstResponse.data.length;

  while (lastPageSize === DEFAULT_PAGE_SIZE && page < MAX_PAGES) {
    const response = await api.get<T[]>(url, {
      ...config,
      params: {
        ...(config?.params ?? {}),
        offset: items.length,
        limit: DEFAULT_PAGE_SIZE,
      },
    });
    items.push(...response.data);
    lastPageSize = response.data.length;
    page += 1;
  }

  return items;
}
