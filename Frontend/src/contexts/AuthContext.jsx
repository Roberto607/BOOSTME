// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../Base';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [authState, setAuthState] = useState(() => {
        if (typeof window === 'undefined') {
            return { isAuthenticated: false, user: null, accessToken: null, loading: true };
        }

        return {
            isAuthenticated: false,
            user: null,
            accessToken: null,
            loading: true
        };
    });

    // Función para actualizar el estado de autenticación
    const updateAuthState = useCallback((updates) => {
        setAuthState(prevState => ({
            ...prevState,
            ...updates
        }));
    }, []);

    const clearAuthData = useCallback(() => {
        updateAuthState({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            loading: false
        });
    }, [updateAuthState]);

    const buildAuthHeaders = useCallback((headers = {}) => {
        const finalHeaders = { ...headers };
        if (authState.accessToken) {
            finalHeaders.Authorization = `Bearer ${authState.accessToken}`;
        }
        return finalHeaders;
    }, [authState.accessToken]);

    // Helpers para exponer setters compatibles con componentes existentes
    const setUser = useCallback((user) => updateAuthState({ user }), [updateAuthState]);
    const setAccessToken = useCallback((accessToken) => updateAuthState({ accessToken }), [updateAuthState]);
    const setIsAuthenticated = useCallback((isAuthenticated) => updateAuthState({ isAuthenticated }), [updateAuthState]);

    const updateUserProfile = useCallback(async (formData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/profile/`, {
                method: 'PATCH',
                credentials: 'include',
                headers: buildAuthHeaders(),
                body: formData
            });

            const parseJsonSafe = async (res) => {
                const text = await res.text();
                if (!text) return null;
                try {
                    return JSON.parse(text);
                } catch (err) {
                    console.error('Invalid JSON response:', text);
                    return null;
                }
            };

            if (!response.ok) {
                const errorData = await parseJsonSafe(response);
                throw new Error((errorData && (errorData.error || errorData.detail)) || 'Error al actualizar el perfil');
            }

            const result = await parseJsonSafe(response);
            if (!result || typeof result !== 'object') {
                throw new Error('Respuesta inválida del servidor al actualizar el perfil');
            }

            const updatedUser = result.user || result;
            if (!updatedUser || typeof updatedUser !== 'object') {
                throw new Error('No se recibió el usuario actualizado');
            }

            // Actualizar el usuario solo en el estado en memoria
            updateAuthState({ user: updatedUser });

            return result;
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw error;
        }
    }, [updateAuthState]);

    const refreshToken = useCallback(async () => {
        try {
            // Usar cookie HttpOnly: realizar llamada al endpoint de refresh con credentials
            const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: buildAuthHeaders({
                    'Content-Type': 'application/json',
                }),
                credentials: 'include',
                body: JSON.stringify({})
            });
            const parseJsonSafe = async (res) => {
                const text = await res.text();
                if (!text) return null;
                try {
                    return JSON.parse(text);
                } catch (err) {
                    console.error('Invalid JSON response:', text);
                    return null;
                }
            };

            if (!response.ok) {
                const errData = await parseJsonSafe(response);
                console.error('Refresh token failed:', errData);
                return null;
            }

            const data = await parseJsonSafe(response);
            updateAuthState({
                accessToken: data?.access || null,
                user: data?.user || null,
                isAuthenticated: Boolean(data?.access)
            });
            return data?.access || null;
        } catch (error) {
            console.error("Error al refrescar token:", error);
            clearAuthData();
            throw error;
        }
    }, [clearAuthData, updateAuthState]);

    const login = useCallback(async (credentials) => {
        try {
            const response = await fetch(`${API_BASE_URL}/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: credentials.username.trim(),
                    password: credentials.password.trim(),
                    remember_me: credentials.remember_me
                })
            });

            const parseJsonSafe = async (res) => {
                const text = await res.text();
                if (!text) return null;
                try {
                    return JSON.parse(text);
                } catch (err) {
                    console.error('Invalid JSON response:', text);
                    return null;
                }
            };

            const data = await parseJsonSafe(response);

            if (!response.ok) {
                if (data && data.code === 'invalid_credentials') {
                    throw new Error('Credenciales inválidas');
                } else if (data && data.code === 'account_not_verified') {
                    throw new Error('Debes verificar tu cuenta antes de iniciar sesión');
                } else {
                    throw new Error((data && (data.error || data.detail)) || 'Error de autenticación');
                }
            }

            // Backend setea cookies HttpOnly; actualizar estado en memoria
            updateAuthState({
                isAuthenticated: true,
                user: data.user,
                accessToken: data.access || null,
                loading: false
            });

            return data;
        } catch (error) {
            console.error("Error en login:", error);
            throw error;
        }
    }, [updateAuthState]);

    const logout = useCallback(() => {
        clearAuthData();
        navigate('/');
    }, [navigate, clearAuthData]);

    // Inicialización: comprobar sesión usando cookies en el backend
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                let res = await fetch(`${API_BASE_URL}/status/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: buildAuthHeaders()
                });

                if (res.status === 401) {
                    try {
                        await refreshToken();
                        res = await fetch(`${API_BASE_URL}/status/`, {
                            method: 'GET',
                            credentials: 'include',
                            headers: buildAuthHeaders()
                        });
                    } catch (refreshError) {
                        console.error('Refresh token failed during initialization:', refreshError);
                    }
                }

                if (!res.ok) {
                    updateAuthState({ loading: false, isAuthenticated: false, user: null, accessToken: null });
                    return;
                }

                const data = await res.json();
                updateAuthState({
                    isAuthenticated: true,
                    user: data.user || null,
                    accessToken: null,
                    loading: false
                });
            } catch (error) {
                console.error("Error al inicializar autenticación:", error);
                updateAuthState({ loading: false, isAuthenticated: false, user: null, accessToken: null });
            }
        };

        const publicPaths = [
            '/',
            '/login',
            '/register',
            '/revisar-correo',
            '/forgot-password',
            '/contact',
            '/verify-wallet',
            '/about',
            '/how-it-works',
            '/help',
            '/privacy-policy',
            '/terms'
        ];

        const isPublicPath = publicPaths.includes(location.pathname) ||
            location.pathname.startsWith('/verify-email/') ||
            location.pathname.startsWith('/reset-password/') ||
            location.pathname.startsWith('/contact') ||
            location.pathname.startsWith('/plans') ||
            location.pathname.startsWith('/about') ||
            location.pathname.startsWith('/help') ||
            location.pathname.startsWith('/how-it-works');

        if (isPublicPath) {
            updateAuthState({ loading: false, isAuthenticated: false, user: null, accessToken: null });
            return;
        }

        initializeAuth();
    }, [location.pathname, refreshToken, updateAuthState, clearAuthData]);

    useEffect(() => {
        if (!authState.isAuthenticated || authState.loading) {
            return;
        }

        const interval = window.setInterval(() => {
            refreshToken().catch(() => {});
        }, 4 * 60 * 1000);

        return () => window.clearInterval(interval);
    }, [authState.isAuthenticated, authState.loading, refreshToken]);

    return (
        <AuthContext.Provider value={{
            ...authState,
            updateAuthState,
            verifyToken: () => authState.isAuthenticated,
            refreshToken,
            login,
            logout,
            updateUserProfile,
            // Backwards-compatible setters
            setUser,
            setAccessToken,
            setIsAuthenticated
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
