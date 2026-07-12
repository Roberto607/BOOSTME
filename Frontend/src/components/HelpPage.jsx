import React from 'react';
import { useNavigate } from 'react-router-dom';

const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)', padding: '24px' }}>
      <div style={{ maxWidth: '560px', width: '100%', background: 'white', borderRadius: '24px', boxShadow: '0 12px 40px rgba(15, 35, 56, 0.16)', padding: '32px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ayuda</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: '2rem', color: '#0f172a' }}>¿Necesitas ayuda?</h1>
        <p style={{ margin: 0, lineHeight: 1.7, color: '#4b5563' }}>
          Aquí encontrarás información básica sobre cómo empezar, cómo recuperar tu acceso y cómo resolver dudas frecuentes en BoostMe.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="mailto:soporte@boostme.com" style={{ background: 'linear-gradient(135deg, #0f172a, #38bdf8)', color: 'white', padding: '12px 18px', borderRadius: '999px', textDecoration: 'none', fontWeight: 600 }}>
            Contactar soporte
          </a>
          <button onClick={() => navigate('/')} style={{ border: '1px solid #d9e2ea', background: 'white', color: '#0f172a', padding: '12px 18px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}>
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
