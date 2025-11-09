import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../Base';
import './AccountActivation.css';

const AccountActivation = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const { uidb64, token } = useParams();
    const navigate = useNavigate();
    const { user, setUser, setAccessToken, setIsAuthenticated } = useAuth();

    useEffect(() => {
        // Si ya hay un usuario autenticado, redirigir
        if (user && user.is_email_verified) {
            navigate('/deposit', { replace: true });
            return;
        }

        activateAccount();
    }, [user, navigate]);

    const activateAccount = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/verify-email/${uidb64}/${token}/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Correo verificado exitosamente 🎉');

                // Actualizar el estado del usuario si se proporciona en la respuesta
                if (data.user) {
                    setUser(data.user);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                }

                // Actualizar tokens si se proporcionan
                if (data.access && data.refresh) {
                    setAccessToken(data.access);
                    localStorage.setItem('access_token', data.access);
                    localStorage.setItem('refresh_token', data.refresh);
                    setIsAuthenticated(true);
                }

                // Redirigir automáticamente al deposito después de la verificación
                setTimeout(() => {
                    navigate('/deposit', { replace: true });
                }, 1500);
            } else {
                setStatus('error');
                setMessage(data.error || 'El enlace de verificación no es válido o ya fue usado.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Error de conexión. Intenta nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Si el usuario ya está verificado, no mostrar nada mientras redirige
    if (user && user.is_email_verified) {
        return null;
    }

    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2>Verificación de Email</h2>

                {status === 'loading' && (
                    <div className="loading-message">
                        <div className="spinner"></div>
                        Verificando tu correo...
                    </div>
                )}

                {status === 'success' && !isLoading && (
                    <div className="success-message">
                        {message}
                        <div className="loading-spinner"></div>
                        <p>Serás redirigido al deposito en unos segundos...</p>
                    </div>
                )}

                {status === 'error' && !isLoading && (
                    <div className="error-message">
                        {message}
                        <button 
                            onClick={() => window.location.reload()} 
                            className="retry-button"
                        >
                            Reintentar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountActivation;

