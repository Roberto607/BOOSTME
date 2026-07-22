// src/config.js

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = rawApiBaseUrl
  ? `${rawApiBaseUrl.replace(/\/$/, "")}/api`
  : "https://boostme-alpd.onrender.com/api";

export const TASKS_API_BASE_URL = "/api/tasks";
export const REFERRALS_API_BASE_URL = "/api/referrals";
export const BONUSES_API_BASE_URL = "/api/bonuses";

export const buildApiUrl = (path) => {
  // Para desarrollo local, usar localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `/api${path.startsWith('/') ? path : `/${path}`}`;
  }

  // En producción, usar la URL de Render
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

