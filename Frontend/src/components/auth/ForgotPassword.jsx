import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../Base';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({ email: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');

    if (!formData.email) {
      setErrors({ email: 'El email es requerido' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Se ha enviado un email con las instrucciones para recuperar tu contraseña');
        setFormData({ email: '' });
      } else {
        setErrors({ general: data.error || 'Error al procesar la solicitud' });
      }
    } catch (error) {
      setErrors({ general: 'Error de conexión. Intenta más tarde.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-700 to-cyan-500 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-[2rem] bg-white/95 p-8 shadow-2xl ring-1 ring-slate-200">
        <h2 className="mb-6 text-2xl font-bold text-slate-950">Recuperar Contraseña</h2>

        {message && (
          <div className="mb-4 rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
            {message}
          </div>
        )}

        {errors.general && (
          <div className="mb-4 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
            {errors.general}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ingresa tu email"
              disabled={isLoading}
              required
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-rose-600">{errors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Enviando...' : 'Enviar instrucciones'}
          </button>

          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-slate-900 transition hover:text-slate-700"
            >
              Volver al login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
