const normalizeBaseUrl = (value) => value?.trim().replace(/\/$/, "");

const explicitApiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL
);

// Configuración para HTTPS
const defaultApiBaseUrl = import.meta.env.PROD
  ? (explicitApiBaseUrl || "https://172.86.114.124")
  : "http://localhost:8000";

const resolvedApiBaseUrl = explicitApiBaseUrl || defaultApiBaseUrl;

export const API_BASE_URL = `${resolvedApiBaseUrl}/api/users/`;
export const TASKS_API_BASE_URL = `${resolvedApiBaseUrl}/api/tasks`;
export const REFERRALS_API_BASE_URL = `${resolvedApiBaseUrl}/api/referrals`;
export const BONUSES_API_BASE_URL = `${resolvedApiBaseUrl}/api/bonuses`;

export const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
