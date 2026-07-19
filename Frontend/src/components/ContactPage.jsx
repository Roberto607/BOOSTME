import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../Base';

const ContactPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitted(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo enviar el mensaje');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err.message || 'Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)', padding: '24px' }}>
      <div style={{ maxWidth: '620px', width: '100%', background: 'white', borderRadius: '24px', boxShadow: '0 12px 40px rgba(15, 35, 56, 0.16)', padding: '32px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contacto</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: '2rem', color: '#0f172a' }}>Pide información con nosotros</h1>
        <p style={{ margin: 0, lineHeight: 1.7, color: '#4b5563' }}>
          Completa este formulario y nos pondremos en contacto contigo para ayudarte con tus dudas o solicitudes.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px', display: 'grid', gap: '14px' }}>
          <input
            type="text"
            name="name"
            placeholder="Tu nombre"
            required
            value={formData.name}
            onChange={handleChange}
            style={{ border: '1px solid #d9e2ea', borderRadius: '12px', padding: '12px 14px', fontSize: '1rem' }}
          />
          <input
            type="email"
            name="email"
            placeholder="Tu correo"
            required
            value={formData.email}
            onChange={handleChange}
            style={{ border: '1px solid #d9e2ea', borderRadius: '12px', padding: '12px 14px', fontSize: '1rem' }}
          />
          <textarea
            name="message"
            placeholder="Escribe tu mensaje"
            required
            rows="5"
            value={formData.message}
            onChange={handleChange}
            style={{ border: '1px solid #d9e2ea', borderRadius: '12px', padding: '12px 14px', fontSize: '1rem', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
            <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #0f172a, #38bdf8)', color: 'white', padding: '12px 18px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            <button type="button" onClick={() => navigate('/')} style={{ border: '1px solid #d9e2ea', background: 'white', color: '#0f172a', padding: '12px 18px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}>
              Volver al inicio
            </button>
          </div>

          {submitted && (
            <p style={{ margin: 0, color: '#0f766e', fontSize: '0.95rem' }}>
              Tu mensaje fue enviado correctamente. Nos pondremos en contacto contigo pronto.
            </p>
          )}

          {error && (
            <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.95rem' }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ContactPage;
