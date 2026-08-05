import { apiClient } from './client';

export async function uploadPrescription(file, uploadSource, onProgress) {
  const formData = new FormData();
  formData.append('prescription', file);
  formData.append('uploadSource', uploadSource);

  const { data } = await apiClient.post('/prescriptions/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return data.data;
}

export async function fetchPrescriptions(page = 1, limit = 20) {
  const { data } = await apiClient.get('/prescriptions', { params: { page, limit } });
  return data;
}

export async function fetchPrescription(id) {
  const { data } = await apiClient.get(`/prescriptions/${id}`);
  return data.data;
}

export async function fetchPrescriptionAuditTrail(id) {
  const { data } = await apiClient.get(`/prescriptions/${id}/audit`);
  return data.data;
}

export async function deletePrescription(id) {
  const { data } = await apiClient.delete(`/prescriptions/${id}`);
  return data.data;
}
