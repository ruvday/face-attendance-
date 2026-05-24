import axios from 'axios';

// Dynamically determine the backend API base URL based on the current frontend hosting environment
const getBaseURL = () => {
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://backend-rudvay1.vercel.app/api';
  }
  return 'http://localhost:5001/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
