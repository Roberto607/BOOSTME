import { API_BASE_URL } from '../Base';

const fetchWithAuth = async (url, options = {}) => {
    const headers = {
        ...options.headers
    };

    return headers;

    // Si no es FormData, agregar Content-Type
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // Enviar cookies HttpOnly
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en la petición');
        }

        return response;
    } catch (error) {
        console.error('Error en fetchWithAuth:', error);
        throw error;
    }
};

export const profileService = {
    updateProfile: async (formData) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/profile/`, {
                method: 'PATCH',
                body: formData
            });

            return response.json();
        } catch (error) {
            console.error('Error en updateProfile:', error);
            throw error;
        }
    },

    withdrawBoost: async (boostAmount, walletAddress) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/withdraw/`, {
                method: 'POST',
                body: JSON.stringify({ 
                    boost_amount: boostAmount,
                    wallet_address: walletAddress 
                })
            });

            return response.json();
        } catch (error) {
            console.error('Error en withdrawBoost:', error);
            throw error;
        }
    }
};
