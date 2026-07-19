import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        remember_me: false
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.username) newErrors.username = 'El usuario es requerido';
        if (!formData.password) newErrors.password = 'La contraseña es requerida';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setErrors({});
        try {
            await login(formData);
            navigate(location.state?.from || '/dashboard');
        } catch (error) {
            setErrors({ general: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-blue-100">
            <div className="w-full max-w-md">
                <form 
                    onSubmit={handleSubmit} 
                    className="bg-white p-8 rounded-2xl shadow-lg flex flex-col"
                >
                    <h1 className="text-center text-3xl font-bold text-blue-600 mb-1">BoostMe</h1>
                    <h2 className="text-center text-gray-700 text-xl mb-6 font-semibold">Iniciar Sesión</h2>

                    {errors.general && (
                        <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center text-sm">
                            {errors.general}
                        </div>
                    )}

                    {/* Username */}
                    <div className="mb-4 flex flex-col">
                        <label htmlFor="username" className="text-gray-600 text-sm mb-1">Usuario</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            placeholder="Ingresa tu usuario"
                            autoComplete="username"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        />
                        {errors.username && (
                            <span className="text-red-600 text-sm mt-1">{errors.username}</span>
                        )}
                    </div>

                    {/* Password */}
                    <div className="mb-4 flex flex-col">
                        <label htmlFor="password" className="text-gray-600 text-sm mb-1">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            placeholder="Ingresa tu contraseña"
                            autoComplete="current-password"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        />
                        {errors.password && (
                            <span className="text-red-600 text-sm mt-1">{errors.password}</span>
                        )}
                    </div>

                    {/* Remember me */}
                    <div className="mb-4 flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="remember_me"
                            checked={formData.remember_me}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label className="text-gray-600 text-sm">Recordarme</label>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>

                    {/* Links */}
                    <div className="mt-4 text-center space-y-2">
                        <p className="text-gray-600 text-sm">
                            ¿No tienes cuenta?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/register')}
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Regístrate
                            </button>
                        </p>
                        <p className="text-gray-600 text-sm">
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                className="text-blue-600 font-medium hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;

