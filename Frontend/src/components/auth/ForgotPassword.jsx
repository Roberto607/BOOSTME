// components/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../Base';
import './Auth.css';

const ForgotPassword = () => {
    const [formData, setFormData] = useState({ email: '' });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setMessage('');

        if (!formData.email) {
            setErrors({ email: 'El email es requerido' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Se ha enviado un email con las instrucciones para recuperar tu contraseña');
                setFormData({ email: '' });
            } else {
                setErrors({ general: data.error || 'Error al procesar la solicitud' });
            }
        } catch (error) {
            setErrors({ general: 'Error de conexión. Intenta más tarde.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Recuperar Contraseña</h2>
                
                {message && (
                    <div className="success-message">
                        {message}
                    </div>
                )}

                {errors.general && (
                    <div className="error-message">
                        {errors.general}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Ingresa tu email"
                        disabled={isLoading}
                        required
                    />
                    {errors.email && (
                        <span className="error-text">{errors.email}</span>
                    )}
                </div>

                <button type="submit" disabled={isLoading} className="submit-button">
                    {isLoading ? 'Enviando...' : 'Enviar instrucciones'}
                </button>

                <div className="auth-links">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="link-button"
                    >
                        Volver al login
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ForgotPassword;
