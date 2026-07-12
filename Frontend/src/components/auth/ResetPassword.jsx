import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../Base';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    password2: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/reset-password/${uidb64}/${token}/`);
        const data = await response.json();
        if (response.ok) {
          setIsValid(true);
        } else {
          setErrors({ general: data.error });
        }
      } catch (error) {
        setErrors({ general: 'Error de conexión' });
      }
    };

    verifyToken();
  }, [uidb64, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Las contraseñas no coinciden' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password/${uidb64}/${token}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        navigate('/login', {
          state: { message: 'Contraseña actualizada exitosamente' }
        });
      } else {
        setErrors({ general: data.error });
      }
    } catch (error) {
      setErrors({ general: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-700 to-cyan-500 px-4 py-10 text-slate-900">
        <div className="mx-auto w-full max-w-md rounded-[2rem] bg-white/95 p-8 shadow-2xl ring-1 ring-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-950">Verificando enlace...</h2>
          {errors.general && (
            <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
              {errors.general}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-700 to-cyan-500 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-[2rem] bg-white/95 p-8 shadow-2xl ring-1 ring-slate-200">
        <h2 className="mb-6 text-2xl font-bold text-slate-950">Crear Nueva Contraseña</h2>

        {errors.general && (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200 mb-4">
            {errors.general}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Nueva Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Ingresa tu nueva contraseña"
              required
              disabled={isLoading}
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label htmlFor="password2" className="block text-sm font-semibold text-slate-700">Confirmar Contraseña</label>
            <input
              type="password"
              id="password2"
              name="password2"
              value={formData.password2}
              onChange={(e) => setFormData(prev => ({ ...prev, password2: e.target.value }))}
              placeholder="Repite la nueva contraseña"
              required
              disabled={isLoading}
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            {errors.password2 && (
              <p className="mt-2 text-sm text-rose-600">{errors.password2}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
