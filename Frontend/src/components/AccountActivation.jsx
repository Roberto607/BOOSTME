import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../Base';
import { MailCheck, Loader2, XCircle } from 'lucide-react';

const AccountActivation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const { user, setUser, setAccessToken, setIsAuthenticated } = useAuth();

  useEffect(() => {
    if (user && user.is_verified) {
      navigate('/deposit', { replace: true });
      return;
    }
    activateAccount();
  }, [user]);

  const activateAccount = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/verify-email/${uidb64}/${token}/`,
        {
          method: 'GET',
          credentials: 'omit',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      const data = await response.json();

        if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Correo verificado exitosamente 🎉');

        if (data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        }

        setTimeout(() => {
          navigate('/deposit', { replace: true });
        }, 1500);
      } else {
        setStatus('error');
        setMessage(
          data.error || 'El enlace de verificación no es válido o ya fue usado.'
        );
      }
    } catch {
      setStatus('error');
      setMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (user && user.is_verified) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      <div className="bg-white rounded-xl shadow p-6 sm:p-8 max-w-md w-full text-center">

        {/* HEADER */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Verificación de Email
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Estamos validando tu cuenta
        </p>

        {/* LOADING */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-600">Verificando tu correo…</p>
          </div>
        )}

        {/* SUCCESS */}
        {status === 'success' && !isLoading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-green-700 font-medium">{message}</p>
            <p className="text-sm text-gray-500">
              Serás redirigido al depósito en unos segundos…
            </p>
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin mt-2" />
          </div>
        )}

        {/* ERROR */}
        {status === 'error' && !isLoading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <p className="text-red-600 font-medium">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              Reintentar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default AccountActivation;
