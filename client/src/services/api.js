import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
  const responseMessage = error?.response?.data?.message;
  const responseError = error?.response?.data?.error;

  if (responseError && (!responseMessage || /^failed\s+to\s+/i.test(responseMessage))) {
    return responseError;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}

export default api;
