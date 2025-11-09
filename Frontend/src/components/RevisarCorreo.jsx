// src/components/RevisarCorreo.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RevisarCorreo.css'; // Reutilizamos los estilos para mantener la consistencia

const RevisarCorreo = () => {
  const navigate = useNavigate();

  const handleGoToLogin = () => {
    navigate('/'); // Asumo que tu login está en la ruta raíz "/"
  };

  return (
    <div className="container">
      <div className="success-card">
        <h1>¡Registro Casi Completo!</h1>
        <p>Te hemos enviado un correo electrónico para verificar tu cuenta.</p>
        <p>Por favor, revisa tu bandeja de entrada (y la carpeta de spam o no deseados) y haz clic en el enlace para activarla.</p>
  
      </div>
    </div>
  );
};

export default RevisarCorreo;
