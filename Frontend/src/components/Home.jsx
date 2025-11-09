import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);

    useEffect(() => {
        if (location.state?.showVerificationMessage) {
            setShowVerificationMessage(true);
        }
    }, [location.state]);

    return (
        <div className="home-container">
            {/* Header con navegación */}
            <header className="home-header">
                <nav className="nav-container">
                    <div className="logo">BoostMe</div>
                    <div className="nav-buttons">
                        <button 
                            onClick={() => navigate('/login')}
                            className="nav-button secondary"
                        >
                            Iniciar Sesión
                        </button>
                        <button 
                            onClick={() => navigate('/register')}
                            className="nav-button primary"
                        >
                            Registrarse
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <h1>💸 Bienvenido a BoostMe</h1>
                    <p>Tu plataforma para ganar dinero en línea de forma fácil, rápida y segura.</p>
                    <p>En BoostMe, transformamos tus minutos libres en oportunidades reales de ingreso.</p>
                    <p>Completa tareas sencillas como ver videos, seguir cuentas, reaccionar a publicaciones o responder encuestas, y acumula recompensas que podrás retirar o reinvertir dentro de la app.</p>
                    <p>Cada acción cuenta — mientras más participas, más crece tu nivel y tu balance 💰.</p>
                </div>
            </section>

            {/* Características principales */}
            <section className="features">
                <h2>🧠 ¿Por qué elegir BoostMe?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">✅</div>
                        <h3>Plataforma segura y transparente</h3>
                        <p>Protección de datos y transacciones seguras para tu tranquilidad.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💼</div>
                        <h3>Pagos confiables</h3>
                        <p>Retira tus ganancias de forma rápida y sin complicaciones.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📈</div>
                        <h3>Sistema de niveles</h3>
                        <p>Sube de rango y desbloquea beneficios exclusivos mientras más participas.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🕒</div>
                        <h3>Tareas flexibles</h3>
                        <p>Realiza actividades cortas desde cualquier lugar y en cualquier momento.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">👑</div>
                        <h3>Soporte constante</h3>
                        <p>Supervisión y ayuda permanente del equipo administrativo.</p>
                    </div>
                </div>
            </section>

            {/* Cómo funciona */}
            <section className="how-it-works">
                <h2>🚀 ¿Cómo funciona?</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Regístrate gratis</h3>
                        <p>Crea tu cuenta con tu correo electrónico en menos de un minuto</p>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Completa tareas</h3>
                        <p>Realiza actividades sencillas y gana puntos o dinero real</p>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Retira y crece</h3>
                        <p>Retira tus ganancias y sube de nivel para acceder a mejores oportunidades</p>
                    </div>
                    <div className="step">
                        <div className="step-number">4</div>
                        <h3>Aumenta tu nivel</h3>
                        <p>Accede a mejores oportunidades y mayores ganancias</p>
                    </div>
                    <div className="step">
                        <div className="step-number">5</div>
                        <h3>Verifícate</h3>
                        <p>Conviértete en usuario verificado para obtener mayores beneficios</p>
                    </div>
                </div>
            </section>

            {/* Call to Action final */}
            <section className="cta-section">
                <h2>💥 Empieza hoy mismo</h2>
                <p>Crea tu cuenta, completa tu primera tarea y descubre lo fácil que es ganar dinero en internet con BoostMe.</p>
                <p>Tu tiempo vale — haz que cada minuto cuente.</p>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3>Producto</h3>
                        <ul>
                            <li><a href="/features">Características</a></li>
                            <li><a href="/pricing">Precios</a></li>
                            <li><a href="/demo">Demo</a></li>
                        </ul>
                    </div>
                    <div className="footer-section">
                        <h3>Compañía</h3>
                        <ul>
                            <li><a href="/about">Sobre Nosotros</a></li>
                            <li><a href="/contact">Contacto</a></li>
                            <li><a href="/blog">Blog</a></li>
                        </ul>
                    </div>
                    <div className="footer-section">
                        <h3>Soporte</h3>
                        <ul>
                            <li><a href="/help">Centro de Ayuda</a></li>
                            <li><a href="/faq">FAQ</a></li>
                            <li><a href="/privacy">Privacidad</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2024 BoostMe. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
