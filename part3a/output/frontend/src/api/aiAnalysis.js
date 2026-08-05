import { apiClient } from './client';

export async function runAiAnalysis(prescriptionId, knownAllergies = []) {
  const { data } = await apiClient.post(`/prescriptions/${prescriptionId}/analyze`, { knownAllergies });
  return data.data;
}

export async function fetchAiAnalysis(prescriptionId) {
  const { data } = await apiClient.get(`/prescriptions/${prescriptionId}/analysis`);
  return data.data;
}
