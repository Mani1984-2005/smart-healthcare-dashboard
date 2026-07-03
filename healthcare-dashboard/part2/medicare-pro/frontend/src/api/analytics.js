import { apiClient } from './client';

export async function fetchAnalyticsDashboard() {
  const { data } = await apiClient.get('/analytics/dashboard');
  return data.data;
}
