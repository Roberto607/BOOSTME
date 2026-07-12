// src/components/AppInitializer.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

const AppInitializer = () => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            navigate(isAuthenticated ? '/dashboard' : '/', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    if (loading) {
        return <LoadingScreen />;
    }

    return null;
};

export default AppInitializer;
