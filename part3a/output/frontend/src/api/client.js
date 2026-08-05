import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000, // OCR can take a few seconds
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message || error.message || 'An unexpected error occurred';
    return Promise.reject({ ...error, friendlyMessage: message });
  }
);
