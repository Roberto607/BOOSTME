import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Instagram, Send, Twitter, Youtube } from 'lucide-react';
import brandLogo from '../../static/Logo Boostme.png';
import { useAuth } from '../contexts/AuthContext';

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

const earnWays = [
  {
    badge: 'Quick',
    title: 'Visita sitios',
    description: 'Explora páginas seleccionadas y gana recompensas por cada visita verificada.',
    reward: '20 pts · 10 seg'
  },
  {
    badge: 'Popular',
    title: 'Mira anuncios',
    description: 'Disfruta contenido patrocinado y acumula puntos con tiempos claros.',
    reward: '50 pts · 20 seg'
  },
  {
    badge: 'Premium',
    title: 'Ve videos',
    description: 'Completa videos cortos y recibe recompensas por interacción real.',
    reward: '70 pts · 30 seg'
  }
];

const bonusHighlights = [
  {
    title: 'Bonos semanales',
    description: 'Recibe recompensas extra al completar tus metas de la semana.',
    icon: '🎁'
  },
  {
    title: 'Multiplicadores',
    description: 'Sube tu rendimiento con bonos especiales según tu actividad.',
    icon: '⚡'
  },
  {
    title: 'Recompensas por referidos',
    description: 'Invita a más usuarios y gana comisiones por su progreso.',
    icon: '🤝'
  }
];

const plans = [
  {
    name: 'Free',
    price: 'Gratis',
    description: 'Perfecto para empezar y probar la plataforma.',
    features: ['Tareas básicas', 'Recompensas simples', 'Acceso rápido']
  },
  {
    name: 'Starter',
    price: '50 USDT',
    description: 'Más volumen y mejores beneficios para crecer.',
    features: ['Más tareas diarias', 'Bonos mejorados', 'Mejor frecuencia de recompensas']
  },
  {
    name: 'Pro',
    price: '150 USDT',
    description: 'Ideal para usuarios activos que quieren más alcance.',
    features: ['Prioridad en tareas', 'Beneficios premium', 'Retiros más ágiles']
  }
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth();
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  useEffect(() => {
    if (location.state?.showVerificationMessage) {
      setShowVerificationMessage(true);
    }
  }, [location.state]);

  const handleOpenPlans = () => {
    navigate('/deposit');
  };

  const handleOpenBonuses = () => {
    navigate('/bonuses');
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef8ff_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="BoostMe logo" className="h-8 w-auto object-contain sm:h-9 md:h-10" />
            <span className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl">BoostMe</span>
          </div>

          <nav className="hidden items-center gap-2 text-sm font-medium text-slate-600 md:flex">
            <button onClick={() => navigate('/how-it-works')} className="rounded-none border-b border-transparent px-2 py-2 transition hover:border-sky-500 hover:text-slate-950">Cómo funciona</button>
            <button onClick={handleOpenPlans} className="rounded-none border-b border-transparent px-2 py-2 transition hover:border-sky-500 hover:text-slate-950">Planes</button>
            <button onClick={handleOpenBonuses} className="rounded-none border-b border-transparent px-2 py-2 transition hover:border-sky-500 hover:text-slate-950">Bonos</button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700 sm:px-4"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => navigate('/register')}
              className="rounded-full bg-gradient-to-r from-[#0f2a44] to-[#38bdf8] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:px-4"
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
        <section className="bg-[linear-gradient(135deg,#0f2a44_0%,#155f7a_45%,#38bdf8_100%)] px-4 py-12 text-white sm:px-6 md:py-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-16">
            <div className="flex flex-col justify-center">
              <span className="mb-4 inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200 sm:px-4">
                Turn your screen time into real rewards
              </span>
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Convierte tu tiempo libre en recompensas reales.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:mt-5 sm:text-lg sm:leading-8">
                Completa tareas simples, desbloquea bonos claros y gestiona tus recompensas desde una experiencia limpia y transparente.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
                <button
                  onClick={() => navigate('/register')}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Crear cuenta gratis
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Iniciar sesión
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="min-w-[140px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                    <strong className="block text-lg font-semibold text-white">{stat.value}</strong>
                    <span className="mt-1 block text-sm text-slate-300">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#0f2a44] to-[#38bdf8] p-5 shadow-2xl sm:p-8 sm:rounded-[2rem]">
                <p className="text-sm font-medium text-slate-200">Tu panel en un solo lugar</p>
                <div className="mt-4 rounded-[1.25rem] bg-slate-950/60 p-4 sm:mt-5 sm:p-5 sm:rounded-[1.5rem]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">Dashboard</span>
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">Activo</span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl bg-white/10 px-4 py-3">Tareas verificadas y recompensas visibles</div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">Bonos y progresos en tiempo real</div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">Retiros y movimientos claros</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 md:py-14 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="mb-3 inline-flex rounded-full bg-gradient-to-r from-[#0f2a44] via-[#38bdf8] to-[#f59e0b] px-3 py-1 text-sm font-semibold text-white">
                3 formas simples de ganar
              </span>
              <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl md:text-4xl">Elige la tarea que mejor encaja con tu tiempo.</h2>
            </div>
            <div className="mt-8 grid gap-6 sm:mt-10 md:grid-cols-3">
              {earnWays.map((way) => (
                <article key={way.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="mb-4 inline-flex rounded-full bg-[#0f2a44] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {way.badge}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-950">{way.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{way.description}</p>
                  <div className="mt-5 text-sm font-semibold text-sky-700">{way.reward}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 md:py-14 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="mb-3 inline-flex rounded-full bg-gradient-to-r from-[#0f2a44] via-[#38bdf8] to-[#f59e0b] px-3 py-1 text-sm font-semibold text-white">
                Cómo funciona
              </span>
              <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl md:text-4xl">Un flujo claro desde que te registras hasta que retiras.</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Tu progreso queda visible, tus recompensas se explican antes de empezar y tu panel te mantiene en control.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#0f2a44] text-sm font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-slate-950">{step.title}</h3>
                  <p className="text-sm leading-7 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 md:py-14 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <span className="mb-3 inline-flex rounded-full bg-gradient-to-r from-[#0f2a44] via-[#38bdf8] to-[#f59e0b] px-3 py-1 text-sm font-semibold text-white">
                Transparente y claro
              </span>
              <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl md:text-4xl">Diseñado para que cada acción tenga sentido.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Desde ver el valor de cada tarea hasta seguir tus bonos y retiros, todo se presenta de forma clara y simple.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f2a44] via-[#38bdf8] to-[#f59e0b] text-2xl text-white shadow-sm">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-slate-950">{feature.title}</h3>
                  <p className="text-sm leading-7 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-[#0f2a44] to-[#38bdf8] px-4 py-12 text-center text-white sm:px-6 md:py-16 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">Empieza hoy y convierte tus minutos en oportunidades.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">Tu tiempo tiene valor. Haz que cada minuto cuente con BoostMe.</p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Crear cuenta gratis
          </button>
        </section>
      </main>
      <footer className="bg-[#0f2a44] px-4 py-10 text-slate-300 sm:px-6 md:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={brandLogo} alt="BoostMe logo" className="h-10 w-auto" />
              <h3 className="text-xl font-semibold text-white">BoostMe</h3>
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-400">
              BoostMe convierte tareas, bonos y referencias en una experiencia simple para ganar valor, seguir tus logros y gestionar tus retiros desde un solo lugar.
            </p>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-3 text-sm text-slate-300">
              <p className="font-semibold text-white">¿Qué encontrarás?</p>
              <p className="mt-1">Planes, recompensas, rachas y herramientas para moverte con claridad.</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300">
                <Youtube size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-pink-500/40 bg-pink-500/10 text-pink-400 transition hover:bg-pink-500/20 hover:text-pink-300">
                <Instagram size={18} />
              </a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-400 transition hover:bg-sky-500/20 hover:text-sky-300">
                <Send size={18} />
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/40 bg-slate-100/10 text-slate-200 transition hover:bg-slate-200/20 hover:text-white">
                <Twitter size={18} />
              </a>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Explorar</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/" className="transition hover:text-white">Inicio</Link></li>
              <li><Link to="/register" className="transition hover:text-white">Crear cuenta</Link></li>
              <li><Link to="/login" className="transition hover:text-white">Iniciar sesión</Link></li>
              <li><Link to="/deposit" className="transition hover:text-white">Planes</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Ayuda</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/quick-help" className="transition hover:text-white">Ayuda rápida</Link></li>
              <li><Link to="/privacy" className="transition hover:text-white">Política de privacidad</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Cómo empezar</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/deposit" className="transition hover:text-white">Elige tu plan y activa tu cuenta</Link></li>
              <li><Link to="/withdraw-info" className="transition hover:text-white">Consulta cómo hacer retiros</Link></li>
              <li><Link to="/help" className="transition hover:text-white">Ver preguntas frecuentes</Link></li>
            </ul>

          </div>
        </div>
        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          © 2026 BoostMe. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Home;

