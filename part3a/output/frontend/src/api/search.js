import { apiClient } from './client';

export async function advancedSearch(params = {}, page = 1, limit = 20) {
  const cleanParams = Object.fromEntries(
    Object.entries({ ...params, page, limit }).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const { data } = await apiClient.get('/search', { params: cleanParams });
  return data;
}
