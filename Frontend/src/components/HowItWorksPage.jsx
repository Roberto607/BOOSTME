import React from 'react';
import { useNavigate } from 'react-router-dom';
import brandLogo from '../../static/Logo Boostme.png';

const steps = [
  {
    title: '1. Crea tu cuenta',
    description: 'Regístrate gratis y accede a tu panel en pocos minutos.'
  },
  {
    title: '2. Completa tareas',
    description: 'Elige tareas simples, sigue instrucciones y acumula progreso diario.'
  },
  {
    title: '3. Recibe recompensas',
    description: 'Gana bonos, sube de nivel y gestiona tus recompensas desde tu panel.'
  },
  {
    title: '4. Retira tus ganancias',
    description: 'Cuando llegues al punto requerido, puedes solicitar tus retiros de forma segura.'
  }
];

const HowItWorksPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <img src={brandLogo} alt="BoostMe logo" className="h-9 w-auto object-contain md:h-10" />
            <span className="text-xl font-bold tracking-tight md:text-2xl">BoostMe</span>
          </button>
          <button
            onClick={() => navigate('/register')}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Crear cuenta
          </button>
        </div>
      </header>

      <main className="px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="max-w-3xl">
            <span className="mb-3 inline-flex rounded-full bg-gradient-to-r from-slate-900 via-sky-700 to-amber-400 px-3 py-1 text-sm font-semibold text-white">
              Cómo funciona BoostMe
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              Una plataforma simple para convertir tu tiempo en recompensas reales.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              BoostMe está pensada para que cualquier persona pueda empezar fácilmente: registrarse, completar tareas, acumular progreso y acceder a bonos y retiros de forma clara.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {steps.map((step) => (
              <article key={step.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">{step.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] bg-slate-950 p-8 text-white">
            <h2 className="text-2xl font-semibold">¿Qué puedes esperar?</h2>
            <p className="mt-3 text-lg leading-8 text-slate-300">
              Una experiencia ordenada, recompensas visibles y un camino claro desde el registro hasta el retiro, sin complicaciones.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Empezar ahora
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HowItWorksPage;
