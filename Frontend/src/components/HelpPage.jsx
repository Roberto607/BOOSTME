import React from 'react';
import { useNavigate } from 'react-router-dom';

const HelpPage = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Cuenta y acceso',
      items: [
        '¿Cómo registro una cuenta?',
        '¿Cómo recupero mi contraseña?',
        '¿Qué hago si no recibo el correo de verificación?'
      ]
    },
    {
      title: 'Planes y suscripciones',
      items: [
        '¿Qué incluye cada plan?',
        '¿Cómo cambio de plan?',
        '¿Cómo sé si mi suscripción está activa?'
      ]
    },
    {
      title: 'Soporte técnico',
      items: [
        '¿Qué hago si la plataforma no carga correctamente?',
        '¿Cómo contacto con soporte?',
        '¿Dónde veo mi historial de solicitudes?'
      ]
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)', padding: '24px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', background: 'white', borderRadius: '24px', boxShadow: '0 12px 40px rgba(15, 35, 56, 0.16)', padding: '32px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Centro de ayuda</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: '2rem', color: '#0f172a' }}>¿Necesitas ayuda?</h1>
        <p style={{ margin: '0 0 18px', lineHeight: 1.7, color: '#4b5563' }}>
          En BoostMe queremos que tu experiencia sea clara y sencilla. Aquí encontrarás respuestas rápidas sobre tu cuenta, planes, seguridad y soporte.
        </p>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: '24px' }}>
          {sections.map((section) => (
            <div key={section.title} style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '18px', background: '#f8fafc' }}>
              <h2 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#0f172a' }}>{section.title}</h2>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#4b5563', lineHeight: 1.7 }}>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, #0f172a, #38bdf8)', color: 'white' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Preguntas frecuentes</h2>
          <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
            Si no encuentras la respuesta que buscas, puedes escribirnos directamente y te ayudaremos con tu caso.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/contact')} style={{ background: 'white', color: '#0f172a', padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600, border: 'none' }}>
              Contactar soporte
            </button>
            <button onClick={() => navigate('/')} style={{ border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
