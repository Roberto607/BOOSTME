// components/auth/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../Base';
import './Auth.css';

const ResetPassword = () => {
    const [formData, setFormData] = useState({
        password: '',
        password2: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const { uidb64, token } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        verifyToken();
    }, []);

    const verifyToken = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/reset-password/${uidb64}/${token}/`);
            const data = await response.json();
            
            if (response.ok) {
                setIsValid(true);
            } else {
                setErrors({ general: data.error });
            }
        } catch (error) {
            setErrors({ general: 'Error de conexión' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.password2) {
            setErrors({ password2: 'Las contraseñas no coinciden' });
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch(`${API_BASE_URL}/reset-password/${uidb64}/${token}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                navigate('/login', { 
                    state: { message: 'Contraseña actualizada exitosamente' }
                });
            } else {
                setErrors({ general: data.error });
            }
        } catch (error) {
            setErrors({ general: 'Error de conexión' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isValid) {
        return (
            <div className="auth-container">
                <div className="auth-form">
                    <h2>Verificando enlace...</h2>
                    {errors.general && (
                        <div className="error-message">
                            {errors.general}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Crear Nueva Contraseña</h2>
                
                {errors.general && (
                    <div className="error-message">
                        {errors.general}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="password">Nueva Contraseña</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Ingresa tu nueva contraseña"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password2">Confirmar Contraseña</label>
                    <input
                        type="password"
                        id="password2"
                        name="password2"
                        value={formData.password2}
                        onChange={(e) => setFormData(prev => ({ ...prev, password2: e.target.value }))}
                        placeholder="Repite la nueva contraseña"
                        required
                        disabled={isLoading}
                    />
                    {errors.password2 && (
                        <span className="error-text">{errors.password2}</span>
                    )}
                </div>

                <button type="submit" disabled={isLoading} className="submit-button">
                    {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
            </form>
        </div>
    );
};

export default ResetPassword;
