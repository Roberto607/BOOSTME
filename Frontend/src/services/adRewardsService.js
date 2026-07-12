// src/services/adRewardsService.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const adRewardsService = {
    registrarRecompensa: async (rewardData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/anuncios/registrar-recompensa/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...rewardData,
                    test_mode: true // Marcar como modo de prueba
                })
            });
            return response.json();
        } catch (error) {
            console.error('Error al registrar recompensa:', error);
            throw error;
        }
    },

    obtenerEstadisticas: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/anuncios/estadisticas/`, {
                credentials: 'include'
            });
            return response.json();
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    }
};
