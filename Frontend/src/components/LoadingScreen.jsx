// src/components/LoadingScreen.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">

      {/* Spinner */}
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />

      {/* Text */}
      <p className="text-gray-600 text-sm sm:text-base font-medium">
        Cargando...
      </p>

    </div>
  );
};

export default LoadingScreen;

