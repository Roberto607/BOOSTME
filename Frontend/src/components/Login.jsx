import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../Base";
import "./Login.css";

const Login = () => {
    const { user, loading, login } = useAuth();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (!loading) {
            if (user) {
                if (!user.is_email_verified) {
                    navigate('/revisar-correo', { replace: true });
                } else if (!user.has_financial_activation) {
                    navigate('/deposit', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            }
        }
    }, [user, loading, navigate]);

    // Si está cargando o el usuario está en proceso de verificación/activación, no mostrar nada
    if (loading || (user && (!user.is_email_verified || !user.has_financial_activation))) {
        return null;
    }

    const [formData, setFormData] = useState({ 
        username: "", 
        password: "",
        remember_me: false
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.username) {
            newErrors.username = "El usuario es requerido";
        }
        
        if (!formData.password) {
            newErrors.password = "La contraseña es requerida";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = e => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            const loginData = {
                username: formData.username.trim(),
                password: formData.password,
                remember_me: formData.remember_me
            };
            
            await login(loginData);
            
            // La redirección se manejará en el useEffect
        } catch (error) {
            console.error("Error en login:", error);
            setErrors({ 
                general: error.message || "Error al iniciar sesión" 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Iniciar sesión</h2>
                
                {errors.general && (
                    <div className="error-message">
                        <span>{errors.general}</span>
                        <button
                            type="button"
                            className="error-close"
                            onClick={() => setErrors({})}
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="username">Usuario o Email</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        placeholder="Ingresa tu usuario o email"
                        autoComplete="username"
                        required
                    />
                    {errors.username && (
                        <span className="error-text">{errors.username}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="password">Contraseña</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        placeholder="Ingresa tu contraseña"
                        autoComplete="current-password"
                        required
                    />
                    {errors.password && (
                        <span className="error-text">{errors.password}</span>
                    )}
                </div>

                <div className="remember-forgot">
                    <label className="remember-me">
                        <input
                            type="checkbox"
                            name="remember_me"
                            checked={formData.remember_me}
                            onChange={handleChange}
                        />
                        Recordarme
                    </label>
                    <button
                        type="button"
                        className="forgot-password"
                        onClick={() => navigate("/forgot-password")}
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="submit-button"
                >
                    {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>

                <div className="register-link">
                    <p>
                        ¿No tienes cuenta?
                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                        >
                            Regístrate
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
};

export default Login;
