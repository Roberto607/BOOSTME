import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../Base";
import { Wallet, Star, Check, ArrowRight, Mail } from 'lucide-react';
import "./DepositoForm.css";

const DepositForm = () => {
    const { user, loading, setUser, setAccessToken, setIsAuthenticated } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [showPlans, setShowPlans] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const navigate = useNavigate();

    const plans = [
        {
            name: 'Free',
            price: 0,
            features: ['3 tareas/día', 'Sin bonus', '5 BOOST/semana'],
            recommended: true,
            isFree: true
        },
        {
            name: 'Starter',
            price: 50,
            features: ['5 tareas/día', '+10% bonus', '10 BOOST/semana'],
            recommended: false
        },
        {
            name: 'Pro',
            price: 150,
            features: ['10 tareas/día', '+20% bonus', '20 BOOST/semana'],
            recommended: false
        },
        {
            name: 'Elite',
            price: 300,
            features: ['20 tareas/día', '+25% bonus', '40 BOOST/semana'],
            recommended: false
        }
    ];

    useEffect(() => {
        if (loading) return;

        if (!user) {
            setError("No se encontró la información del usuario. Por favor, inicia sesión.");
            return;
        }

        if (!user.is_email_verified) {
            setShowVerification(true);
            return;
        }

        setShowPlans(true);
    }, [user, loading]);

    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
    };

    const handleResendVerification = async () => {
        setIsVerifying(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch(`${API_BASE_URL}/resend-verification/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email })
            });

            const data = await response.json();
            if (response.ok) {
                setMessage("Correo de verificación enviado. Revisa tu bandeja de entrada.");
            } else {
                setError(data.error || "Error al enviar el correo de verificación");
            }
        } catch (err) {
            setError("Error de conexión. Intenta más tarde.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/activate-plan/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    plan: selectedPlan.name,
                    email: user.email,
                    amount: selectedPlan.price || 0
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.access && data.refresh) {
                    localStorage.setItem('access_token', data.access);
                    localStorage.setItem('refresh_token', data.refresh);
                    
                    const updatedUserData = {
                        ...user,
                        ...data.user,
                        has_financial_activation: true,
                        plan_name: selectedPlan.name
                    };
                    localStorage.setItem('user_data', JSON.stringify(updatedUserData));
                    
                    setUser(updatedUserData);
                    setAccessToken(data.access);
                    setIsAuthenticated(true);
                }

                const boostMessage = data.boost_added ? ` +${data.boost_added} BOOST` : "";
                setMessage(`¡Plan ${selectedPlan.name} activado correctamente!${boostMessage}`);
                setTimeout(() => navigate("/dashboard"), 2000);
            } else {
                setError(data.error || "Error al activar el plan");
            }
        } catch (err) {
            setError("Error de conexión. Intenta más tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <h2>Cargando información...</h2>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="error-container">
                <h2>Sesión no encontrada</h2>
                <p>Por favor, inicia sesión nuevamente.</p>
                <button onClick={() => navigate("/login")} className="login-button">
                    Iniciar Sesión
                </button>
            </div>
        );
    }

    if (showVerification) {
        return (
            <div className="verification-container">
                <div className="verification-content">
                    <Mail className="verification-icon" />
                    <h2>Verificación de Correo</h2>
                    <p>Hemos enviado un correo de verificación a:</p>
                    <p className="email-display">{user.email}</p>
                    <p>Por favor, revisa tu correo y haz clic en el enlace de verificación.</p>
                    <p>¿No recibiste el correo?</p>
                    <button 
                        onClick={handleResendVerification} 
                        className="resend-button"
                        disabled={isVerifying}
                    >
                        {isVerifying ? "Enviando..." : "Reenviar correo"}
                    </button>
                    <button 
                        onClick={() => navigate("/login")} 
                        className="login-link"
                    >
                        Ir a Iniciar Sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="deposit-container">
            <div className="deposit-header">
                <h1>¡Bienvenido a BoostMe!</h1>
                <p>
                    {user.has_financial_activation 
                        ? "Actualiza tu plan para obtener más beneficios" 
                        : "Activa tu cuenta y empieza a ganar BOOST"
                    }
                </p>
                {user.has_financial_activation && (
                    <p className="current-plan">
                        Plan actual: {user.plan_name || 'Free'}
                    </p>
                )}
            </div>

            {showPlans && !selectedPlan && (
                <div className="plans-section">
                    <h2>Selecciona tu Plan</h2>
                    <div className="plans-grid">
                        {plans.map((plan) => (
                            <div 
                                key={plan.name}
                                className={`plan-card ${plan.recommended ? 'recommended' : ''} ${plan.isFree ? 'free-plan' : ''}`}
                                onClick={() => handlePlanSelect(plan)}
                            >
                                {plan.recommended && (
                                    <div className="recommended-badge">
                                        <Star className="badge-icon" />
                                        Recomendado
                                    </div>
                                )}
                                {plan.isFree && (
                                    <div className="free-badge">
                                        <Wallet className="badge-icon" />
                                        Gratis
                                    </div>
                                )}
                                <h3>{plan.name}</h3>
                                <div className="price">
                                    {plan.isFree ? 'GRATIS' : `${plan.price / 10} USDT`}
                                    {!plan.isFree && <small>({plan.price} BOOST)</small>}
                                </div>
                                <ul className="features">
                                    {plan.features.map((feature, index) => (
                                        <li key={index}>
                                            <Check className="check-icon" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button className="select-plan-button">
                                    {plan.isFree ? 'Activar Gratis' : 'Seleccionar Plan'}
                                    <ArrowRight className="button-icon" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedPlan && (
                <form className="deposit-form" onSubmit={handleDeposit}>
                    <div className="selected-plan">
                        <h3>Plan Seleccionado: {selectedPlan.name}</h3>
                        <button 
                            type="button" 
                            className="change-plan"
                            onClick={() => setSelectedPlan(null)}
                        >
                            Cambiar plan
                        </button>
                    </div>

                    {message && <div className="success-message">{message}</div>}
                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? "Activando..." : `Activar Plan ${selectedPlan.name}`}
                    </button>
                </form>
            )}
        </div>
    );
};

export default DepositForm;
