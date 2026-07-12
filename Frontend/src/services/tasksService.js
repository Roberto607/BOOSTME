import { API_BASE_URL, TASKS_API_BASE_URL } from '../Base';

const fetchWithAuth = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (response.status === 401) {
        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!refreshResponse.ok) {
                throw new Error('Error al refrescar token');
            }

            return fetch(url, {
                ...options,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
        } catch (refreshError) {
            console.warn('No se pudo refrescar la sesión de tareas:', refreshError);
            return response;
        }
    }

    return response;
};

export const tasksService = {
    // Obtener tareas diarias
    getDailyTasks: async () => {
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/tasks/daily_tasks/`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener las tareas diarias');
        }
        return response.json();
    },

    // Obtener tareas con filtros
    getTasks: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/tasks/?${params}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener las tareas');
        }
        return response.json();
    },

    // Completar una tarea
    completeTask: async (taskId, payload = {}) => {
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/tasks/${taskId}/complete/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al completar la tarea');
        }
        return response.json();
    },

    // Obtener historial de tareas
    getTaskHistory: async () => {
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/completions/`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener el historial');
        }
        return response.json();
    },

    // Generar tareas diarias
    generateDailyTasks: async () => {
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/tasks/generate_daily/`, {
            method: 'POST'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al generar tareas');
        }
        return response.json();
    },

    // Obtener información de racha
    getStreakInfo: async () => {
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/completions/streak_info/`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener información de racha');
        }
        return response.json();
    },

    // Obtener tareas de AdGate Media
    getAdGateTasks: async () => {
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/tasks/adgate_tasks/`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener las tareas de AdGate');
        }
        return response.json();
    },

    // Obtener categorías de tareas
    getTaskCategories: async () => {
        const response = await fetchWithAuth(`${TASKS_API_BASE_URL}/categories/`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener las categorías');
        }
        return response.json();
    }
};
