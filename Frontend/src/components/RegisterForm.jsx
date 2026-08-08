import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../Base";

const RegisterForm = () => {
    const navigate = useNavigate();
    const { user, setUser, setAccessToken, setIsAuthenticated } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showEmailNotice, setShowEmailNotice] = useState(false);

    useEffect(() => {
        if (!user) {
            setShowEmailNotice(false);
            return;
        }

        if (!user.is_verified) {
            setShowEmailNotice(true);
            return;
        }

        navigate("/dashboard", { replace: true });
    }, [user, navigate]);

    useEffect(() => {
        if (!showEmailNotice) return;

        const timer = window.setTimeout(() => {
            setShowEmailNotice(false);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [showEmailNotice]);

    if (window.location.pathname.includes("/verify-email/") || window.location.pathname.includes("/verify-wallet")) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones mejoradas para coincidir con el backend
        if (!email || !username || !password) {
            return setError("Todos los campos son requeridos");
        }
        
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return setError("Formato de email inválido");
        }
        
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return setError("El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos");
        }

        if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
            return setError("La dirección de la billetera es requerida y debe ser una dirección válida de 42 caracteres que comience con 0x.");
        }
        
        if (password.length < 8) {
            return setError("La contraseña debe tener al menos 8 caracteres");
        }
        
        if (!/[A-Z]/.test(password)) {
            return setError("La contraseña debe contener al menos una letra mayúscula");
        }
        
        if (!/[a-z]/.test(password)) {
            return setError("La contraseña debe contener al menos una letra minúscula");
        }
        
        if (!/[0-9]/.test(password)) {
            return setError("La contraseña debe contener al menos un número");
        }
        
        if (password !== confirmPassword) {
            return setError("Las contraseñas no coinciden");
        }

        try {
            setError("");
            setSuccess("");
            setShowEmailNotice(false);
            setLoading(true);

            const registerUrl = `${API_BASE_URL}/register/`;
            console.log("Register URL:", registerUrl);

            const response = await fetch(registerUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    wallet_address: walletAddress.trim().toLowerCase()
                }),
                credentials: 'include' // Importante para manejar cookies
            });

            let data = null;
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                try {
                    data = await response.json();
                } catch {
                    data = null;
                }
            } else {
                try {
                    const text = await response.text();
                    data = text ? { error: text } : null;
                } catch {
                    data = null;
                }
            }

            if (response.ok) {
                const userData = data?.user || null;
                const token = data?.access || null;
                const refreshToken = data?.refresh || null;

                setUser(userData);
                setIsAuthenticated(true);

                if (data?.next_step === 'verify_wallet') {
                    const verificationData = {
                        wallet_address: data.wallet_address,
                        wallet_verification_nonce: data.wallet_verification_nonce,
                    };
                    sessionStorage.setItem('walletVerificationData', JSON.stringify(verificationData));
                    navigate('/verify-wallet', { replace: true, state: verificationData });
                    return;
                }

                setSuccess(data?.message || "Registro exitoso. Continúa al siguiente paso.");
            } else {
                // Manejar códigos de error específicos del backend
                switch (data?.code) {
                    case "missing_fields":
                        setError("Todos los campos son requeridos");
                        break;
                    case "invalid_content_type":
                        setError("Error en el formato de la solicitud");
                        break;
                    case "invalid_email":
                        setError("Formato de email inválido");
                        break;
                    case "invalid_username":
                        setError("El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos");
                        break;
                    case "password_too_short":
                        setError("La contraseña debe tener al menos 8 caracteres");
                        break;
                    case "password_missing_uppercase":
                        setError("La contraseña debe contener al menos una letra mayúscula");
                        break;
                    case "password_missing_lowercase":
                        setError("La contraseña debe contener al menos una letra minúscula");
                        break;
                    case "password_missing_number":
                        setError("La contraseña debe contener al menos un número");
                        break;
                    case "email_exists":
                        setError("Ya existe una cuenta con este email");
                        break;
                    case "username_exists":
                        setError("El nombre de usuario ya está en uso");
                        break;
                    default:
                        setError(data?.error || data?.detail || "Error al crear la cuenta");
                }
            }
        } catch (err) {
            console.error("Error en el registro:", err);
            if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                setError("No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.");
            } else {
                setError("Error de conexión. Intenta más tarde.");
            }
        }

        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-5 bg-gray-100">
            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-xl p-8 md:p-10 w-full max-w-md animate-fadeIn flex flex-col"
            >
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Crear Cuenta</h2>

                {(error || success) && (
                    <div className="mb-4 space-y-2">
                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-600 text-red-700 px-4 py-3 rounded flex justify-between items-center animate-fadeIn">
                                <span>{error}</span>
                                <button type="button" className="text-red-600 font-bold text-lg" onClick={() => setError("")}>×</button>
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-100 border-l-4 border-green-600 text-green-700 px-4 py-3 rounded animate-fadeIn">
                                <span>{success}</span>
                            </div>
                        )}
                    </div>
                )}

                <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Nombre de Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    minLength={3}
                    maxLength={20}
                    className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition"
                />

                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition"
                />

                <input
                    id="walletAddress"
                    name="walletAddress"
                    type="text"
                    autoComplete="off"
                    placeholder="Dirección de la billetera (0x...)"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition"
                />

                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Contraseña (mínimo 8 caracteres, mayúscula, minúscula y número)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={8}
                    className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition"
                />

                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirmar Contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={8}
                    className="w-full p-3 mb-6 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-800 hover:shadow-lg text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creando Cuenta..." : "Registrarse"}
                </button>

                <div className="text-center mt-4 text-gray-600 text-sm">
                    ¿Ya tienes una cuenta?
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="ml-2 text-blue-600 font-medium hover:underline"
                    >
                        Inicia Sesión
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterForm;

