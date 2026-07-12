import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import brandLogo from '../../static/Logo Boostme.png';

const features = [
  {
    title: 'Plataforma segura',
    description: 'Tus datos y tus recompensas están protegidos con un flujo claro y transparente.',
    icon: '🛡️'
  },
  {
    title: 'Pagos flexibles',
    description: 'Gestiona tus ganancias y retira cuando quieras desde tu panel de usuario.',
    icon: '💳'
  },
  {
    title: 'Niveles y bonos',
    description: 'Cada acción te acerca a mejores recompensas, más beneficios y más motivación.',
    icon: '📈'
  },
  {
    title: 'Tareas rápidas',
    description: 'Completa acciones breves desde cualquier dispositivo y suma progreso en minutos.',
    icon: '⚡'
  }
];

const steps = [
  {
    number: '1',
    title: 'Regístrate gratis',
    description: 'Crea tu cuenta y accede a tu panel en menos de un minuto.'
  },
  {
    number: '2',
    title: 'Completa tareas',
    description: 'Realiza actividades sencillas y acumula recompensas de forma continua.'
  },
  {
    number: '3',
    title: 'Retira y crece',
    description: 'Convierte tu progreso en oportunidades reales y mejora tu nivel.'
  }
];

const stats = [
  { label: 'Usuarios activos', value: '10k+' },
  { label: 'Tareas diarias', value: '24/7' },
  { label: 'Retiro rápido', value: 'En minutos' }
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  useEffect(() => {
    if (location.state?.showVerificationMessage) {
      setShowVerificationMessage(true);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="BoostMe logo" className="h-9 w-auto object-contain md:h-10" />
            <span className="text-xl font-bold tracking-tight md:text-2xl">BoostMe</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate('/login')}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => navigate('/register')}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {showVerificationMessage && (
        <div className="mx-4 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700 md:mx-6 lg:mx-8">
          Tu correo fue verificado correctamente. Ya puedes iniciar sesión.
        </div>
      )}

      <main className="flex flex-col">
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center gap-6">
            <span className="inline-flex rounded-full bg-gradient-to-r from-slate-900 via-sky-700 to-amber-400 px-4 py-1 text-sm font-semibold text-white shadow-lg shadow-slate-900/10">
              Nueva forma de ganar online
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-5xl lg:text-6xl">
              Convierte tu tiempo libre en recompensas reales.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              BoostMe reúne tareas simples, niveles claros y recompensas progresivas para que cada minuto cuente.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/register')}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Crear cuenta gratis
              </button>
              <button
                onClick={() => navigate('/login')}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-900"
              >
                Ya tengo cuenta
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <strong className="block text-lg font-bold text-slate-950">{stat.value}</strong>
                  <span className="mt-1 block text-sm text-slate-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-full rounded-[2rem] bg-gradient-to-br from-slate-900 to-sky-700 p-8 text-white shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <span className="text-sm font-medium text-slate-200">Tu progreso en un solo lugar</span>
                <strong className="text-sm font-semibold text-white">+25% de motivación</strong>
              </div>
              <ul className="space-y-3 text-sm text-slate-100/90">
                <li className="rounded-3xl bg-white/10 px-4 py-3">Completa tareas diarias</li>
                <li className="rounded-3xl bg-white/10 px-4 py-3">Desbloquea bonos y mejoras</li>
                <li className="rounded-3xl bg-white/10 px-4 py-3">Gestiona tus recompensas con facilidad</li>
              </ul>
            </div>
          </div>
        </section>
        <section className="bg-white px-4 py-14 md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-3 inline-flex rounded-full bg-gradient-to-r from-slate-900 via-sky-700 to-amber-400 px-3 py-1 text-sm font-semibold text-white">
              ¿Por qué elegir BoostMe?
            </span>
            <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">Todo lo que necesitas para empezar y seguir creciendo.</h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-sky-700 to-amber-400 text-2xl text-white shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-950">{feature.title}</h3>
                <p className="text-sm leading-7 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-slate-100 px-4 py-14 md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-3 inline-flex rounded-full bg-gradient-to-r from-slate-900 via-sky-700 to-amber-400 px-3 py-1 text-sm font-semibold text-white">
              Cómo funciona
            </span>
            <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">Empieza en pocos minutos y ve resultados claros.</h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-950">{step.title}</h3>
                <p className="text-sm leading-7 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-gradient-to-r from-slate-900 to-sky-700 px-4 py-16 text-center text-white md:px-6 lg:px-8">
          <h2 className="text-3xl font-bold md:text-4xl">Empieza hoy y convierte tus minutos en oportunidades.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-200">Tu tiempo tiene valor. Haz que cada minuto cuente con BoostMe.</p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Crear cuenta gratis
          </button>
        </section>
      </main>
      <footer className="bg-slate-950 px-4 py-12 text-slate-300 md:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={brandLogo} alt="BoostMe logo" className="h-10 w-auto" />
              <h3 className="text-xl font-semibold text-white">BoostMe</h3>
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-400">
              Tu plataforma para convertir tiempo libre en recompensas reales y experiencias más útiles.
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Explorar</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/register" className="transition hover:text-white">Crear cuenta</Link></li>
              <li><Link to="/login" className="transition hover:text-white">Iniciar sesión</Link></li>
              <li><Link to="/" className="transition hover:text-white">Inicio</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Soporte</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/help" className="transition hover:text-white">Ayuda</Link></li>
              <li><Link to="/privacy" className="transition hover:text-white">Privacidad</Link></li>
              <li><Link to="/contact" className="transition hover:text-white">Contacto</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          © 2024 BoostMe. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Home;

