import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickHelpPage = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: '¿No puedes entrar?',
      text: 'Revisa tu correo de verificación o vuelve a iniciar sesión.',
    },
    {
      title: '¿Tienes problemas con un plan?',
      text: 'Consulta tus planes activos y confirma tu estado de suscripción.',
    },
    {
      title: '¿Necesitas ayuda con retiros?',
      text: 'Revisa la información de retiros y contacta con soporte si algo no encaja.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)', padding: '24px' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto', background: 'white', borderRadius: '24px', boxShadow: '0 12px 40px rgba(15, 35, 56, 0.16)', padding: '32px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ayuda rápida</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: '2rem', color: '#0f172a' }}>¿Necesitas una respuesta inmediata?</h1>
        <p style={{ margin: '0 0 18px', lineHeight: 1.7, color: '#4b5563' }}>
          Esta sección está pensada para ayudarte a resolver dudas básicas de forma rápida antes de contactar con soporte.
        </p>

        <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
          {quickActions.map((item) => (
            <div key={item.title} style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '16px', background: '#f8fafc' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#0f172a' }}>{item.title}</h2>
              <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/contact')} style={{ background: '#0f172a', color: 'white', padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600, border: 'none' }}>
            Contactar soporte
          </button>
          <button onClick={() => navigate('/help')} style={{ border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}>
            Ver preguntas frecuentes
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickHelpPage;
