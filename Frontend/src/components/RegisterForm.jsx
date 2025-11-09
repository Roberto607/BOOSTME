import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../Base";
import "./RegisterForm.css";

const RegisterForm = () => {
    const navigate = useNavigate();
    const { user, setUser, setAccessToken, setIsAuthenticated } = useAuth();
    
    // Todos los hooks deben estar antes de cualquier retorno condicional
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            if (!user.is_email_verified) {
                navigate('/revisar-correo', { replace: true });
            } else if (!user.has_financial_activation) {
                navigate('/deposit', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, navigate]);

    useEffect(() => {
        // Si está en una ruta de verificación, no mostrar el formulario
        if (window.location.pathname.includes('/verify-email/')) {
            return;
        }
    }, []);

    // Si el usuario existe o está en una ruta de verificación, no mostrar nada
    if (user || window.location.pathname.includes('/verify-email/')) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email || !username || !password) {
            return setError("Todos los campos son requeridos");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return setError("Formato de email inválido");
        }

        if (password.length < 8) {
            return setError("La contraseña debe tener al menos 8 caracteres");
        }

        if (password !== confirmPassword) {
            return setError("Las contraseñas no coinciden");
        }

        try {
            setError("");
            setLoading(true);

            const response = await fetch(`${API_BASE_URL}/register/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username.trim(),
                    email: email.trim().toLowerCase(),
                    password
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                localStorage.setItem('user_data', JSON.stringify(data.user));
                
                setUser(data.user);
                setAccessToken(data.access);
                setIsAuthenticated(true);

                navigate('/revisar-correo', { replace: true });
            } else {
                switch(data.code) {
                    case "missing_fields":
                        setError("Todos los campos son requeridos");
                        break;
                    case "invalid_email":
                        setError("Formato de email inválido");
                        break;
                    case "password_too_short":
                        setError("La contraseña debe tener al menos 8 caracteres");
                        break;
                    case "email_exists":
                        setError("Ya existe una cuenta con este email");
                        break;
                    case "username_exists":
                        setError("El nombre de usuario ya está en uso");
                        break;
                    default:
                        setError(data.error || "Error al crear la cuenta");
                }
            }
        } catch (err) {
            console.error("Error en el registro:", err);
            setError("Error de conexión. Intenta más tarde.");
        }
        
        setLoading(false);
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Crear Cuenta</h2>

                {error && (
                    <div className="error-message">
                        {error}
                        <button 
                            type="button" 
                            className="error-close"
                            onClick={() => setError("")}
                        >
                            ×
                        </button>
                    </div>
                )}
                
                <input
                    type="text"
                    placeholder="Nombre de Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    minLength={3}
                />
                
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                />
                
                <input
                    type="password"
                    placeholder="Contraseña (mínimo 8 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={8}
                />
                
                <input
                    type="password"
                    placeholder="Confirmar Contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={8}
                />
                
                <button type="submit" disabled={loading}>
                    {loading ? "Creando Cuenta..." : "Registrarse"}
                </button>
                
                <div className="register-link">
                    ¿Ya tienes una cuenta? 
                    <button type="button" onClick={() => navigate("/login")}>
                        Inicia Sesión
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterForm;
