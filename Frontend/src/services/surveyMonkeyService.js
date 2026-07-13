import { API_BASE_URL } from '../Base';

const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || errorData?.detail || 'Error en la petición');
  }

  return response.json();
};

export const surveyMonkeyService = {
  getAuthorizeUrl: async () => {
    return fetchWithAuth(`${API_BASE_URL}/surveymonkey/authorize/`, {
      method: 'GET'
    });
  }
};
