// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../Base'

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        console.log("AuthProvider - Inicializando...");
        
        const token = localStorage.getItem('access_token');
        const refreshTokenValue = localStorage.getItem('refresh_token');
        const userData = localStorage.getItem('user_data');

        if (!token || !refreshTokenValue || !userData) {
            console.log("No hay datos de autenticación");
            setLoading(false);
            return;
        }

        try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setAccessToken(token);
            setIsAuthenticated(true);
        } catch (error) {
            console.error("Error al procesar datos de autenticación:", error);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_data');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const login = async (credentials) => {
        try {
            console.log("AuthContext - Iniciando login...");
            
            const response = await fetch(`${API_BASE_URL}/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: credentials.username.trim(),
                    password: credentials.password.trim(),
                    remember_me: credentials.remember_me
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                if (data.code === 'invalid_credentials') {
                    throw new Error('Credenciales inválidas');
                } else if (data.code === 'email_not_verified') {
                    throw new Error('Debes verificar tu email antes de iniciar sesión');
                } else {
                    throw new Error(data.error || 'Error de autenticación');
                }
            }

            // Guardar tokens y datos del usuario
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('user_data', JSON.stringify(data.user));

            // Actualizar estado
            setIsAuthenticated(true);
            setUser(data.user);
            setAccessToken(data.access);

            return data;
        } catch (error) {
            console.error("Error en login:", error);
            throw error;
        }
    };

    const logout = () => {
        // Limpiar storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');

        // Limpiar estado
        setIsAuthenticated(false);
        setUser(null);
        setAccessToken(null);
        
        navigate('/register');
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            accessToken,
            loading,
            setUser,
            setAccessToken,
            setIsAuthenticated,
            isEmailVerified: user?.is_email_verified || false,
            hasFinancialActivation: user?.has_financial_activation || false,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};
