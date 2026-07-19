import React from 'react';
import { useNavigate } from 'react-router-dom';

const WithdrawInfoPage = () => {
  const navigate = useNavigate();

  const steps = [
    {
      title: '1. Verifica tu cuenta',
      text: 'Asegúrate de tener tu cuenta activa y tus datos completos para poder solicitar un retiro.',
    },
    {
      title: '2. Revisa tu saldo disponible',
      text: 'Solo podrás retirar el importe que tengas disponible según tus planes y reglas de la plataforma.',
    },
    {
      title: '3. Solicita el retiro',
      text: 'Desde la sección de retiros, selecciona el monto y confirma la solicitud.',
    },
    {
      title: '4. Espera la confirmación',
      text: 'El proceso se revisa y te notificaremos cuando el retiro haya sido gestionado.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0ea5e9 100%)', padding: '24px' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto', background: 'white', borderRadius: '24px', boxShadow: '0 12px 40px rgba(15, 35, 56, 0.16)', padding: '32px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Retiros</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: '2rem', color: '#0f172a' }}>Cómo hacer un retiro</h1>
        <p style={{ margin: '0 0 18px', lineHeight: 1.7, color: '#4b5563' }}>
          Aquí tienes una guía simple para entender cómo funciona el proceso de retiros en BoostMe.
        </p>

        <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
          {steps.map((step) => (
            <div key={step.title} style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '16px', background: '#f8fafc' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#0f172a' }}>{step.title}</h2>
              <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>{step.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/withdraw')} style={{ background: '#0f172a', color: 'white', padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600, border: 'none' }}>
            Ir a retiros
          </button>
          <button onClick={() => navigate('/contact')} style={{ border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}>
            Contactar soporte
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawInfoPage;
