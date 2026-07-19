import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)', padding: '24px' }}>
      <div style={{ maxWidth: '760px', width: '100%', background: 'white', borderRadius: '24px', boxShadow: '0 12px 40px rgba(15, 35, 56, 0.16)', padding: '32px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Política de privacidad</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: '2rem', color: '#0f172a' }}>Protección y tratamiento de tus datos personales</h1>
        <p style={{ margin: '0 0 18px', lineHeight: 1.7, color: '#4b5563' }}>
          En BoostMe nos comprometemos a proteger la privacidad de los usuarios que acceden a nuestra plataforma. Esta política describe cómo recopilamos, usamos, almacenamos y protegemos la información personal que proporcionas al registrarte o utilizar nuestros servicios.
        </p>

        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>1. Información que recopilamos</h2>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#4b5563' }}>
            Recopilamos información necesaria para operar la plataforma, como datos de registro, información de contacto, datos de perfil y datos relacionados con el uso de la aplicación, con el fin de prestar un servicio seguro, eficiente y personalizado.
          </p>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>2. Finalidad del tratamiento de datos</h2>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#4b5563' }}>
            La información personal se utiliza para crear y administrar tu cuenta, verificar tu identidad, facilitar la comunicación con el usuario, mejorar la experiencia de uso, prevenir fraudes y garantizar la seguridad de la plataforma.
          </p>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>3. Protección de la información</h2>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#4b5563' }}>
            Implementamos medidas razonables de seguridad para proteger tus datos frente a pérdidas, accesos no autorizados o usos indebidos. Sin embargo, ningún sistema de transmisión o almacenamiento es completamente infalible.
          </p>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>4. Derechos del usuario</h2>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#4b5563' }}>
            Puedes solicitar acceso, corrección o eliminación de tus datos personales, en la medida en que ello sea compatible con el funcionamiento de la plataforma y con las obligaciones legales aplicables.
          </p>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>5. Contacto</h2>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#4b5563' }}>
            Si tienes preguntas o solicitudes relacionadas con esta política de privacidad o con el tratamiento de tus datos, puedes comunicarte con nosotros a través del formulario de contacto disponible en la plataforma.
          </p>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')} style={{ border: '1px solid #d9e2ea', background: 'white', color: '#0f172a', padding: '12px 18px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}>
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
