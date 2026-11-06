import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('app_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Central 401 handling: token expired/invalid -> clear it and let the app redirect to login.
// We dispatch a custom event rather than importing the router here, to avoid a circular
// dependency between the API layer and the app shell.
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('app_token');
      localStorage.removeItem('app_user');
      window.dispatchEvent(new CustomEvent('app:unauthorized'));
    }
    return Promise.reject(err);
  }
);

/** Pulls a readable message out of an API error response, with a safe fallback. */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;
}

export default apiClient;
