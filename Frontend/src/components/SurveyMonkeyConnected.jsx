import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SurveyMonkeyConnected = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const status = params.get('status');
  const message = params.get('message');

  const friendlyMessage = () => {
    if (status === 'success') return 'SurveyMonkey se conectó correctamente.';
    if (status === 'error') {
      switch (message) {
        case 'missing_code':
          return 'Falta el código de autorización.';
        case 'missing_credentials':
          return 'Faltan credenciales de SurveyMonkey en el backend.';
        case 'user_not_found':
          return 'No se pudo identificar al usuario de BoostMe.';
        case 'token_exchange_failed':
          return 'No se pudo intercambiar el código por token.';
        case 'token_validation_failed':
          return 'El token de SurveyMonkey no pudo validarse.';
        default:
          return 'Ocurrió un error al conectar con SurveyMonkey.';
      }
    }
    return 'Estado desconocido.';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Conexión SurveyMonkey</h1>
        <p className="text-gray-700 mb-6">{friendlyMessage()}</p>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
          onClick={() => navigate('/Profile')}
        >
          Volver a mi perfil
        </button>
      </div>
    </div>
  );
};

export default SurveyMonkeyConnected;
