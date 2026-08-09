import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  Target,
  Gift,
  Users,
  Star,
  Trophy,
  Menu,
  X,
  Crown,
  CheckCircle2,
  ArrowRight,
  Flame,
  Clock3
} from 'lucide-react';
// Dashboard styles moved to Tailwind in index.css and component classes
import Profile from './Perfil/Profile';
import TasksList from './Tasks/TasksList';
import Referidos from './Referidos/Referidos';
import Bonuses from './Bonuses/bonuses';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const [userBalance, setUserBalance] = useState({
    purchased: 0,
    earned: 0,
    wallet: 0,
    weeklyLimit: 0,
    currentWeekWithdrawn: 0,
    nextWithdrawalDate: null
  });

  const [userPlan, setUserPlan] = useState({
    name: 'Free',
    dailyTasks: 3,
    bonus: 0,
    weeklyLimit: 5,
    expiryDate: null,
    daysRemaining: 0
  });

  const [referralStats, setReferralStats] = useState({
    referralCount: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    canWithdraw: false
  });

  const calculateDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = Math.abs(expiry - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateNextWithdrawalDate = () => {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toLocaleDateString();
  };

  const canWithdrawNow = userBalance.earned > 0 && userBalance.currentWeekWithdrawn < userBalance.weeklyLimit;
  const progressPercent = Math.min(100, Math.round(((userBalance.earned + userBalance.purchased) / Math.max(1, userBalance.weeklyLimit * 2)) * 100));
  const streakValue = user?.user_plan?.plan_name ? 4 : 2;
  const recommendedActions = [
    { title: 'Completa una tarea', description: 'Sigue acumulando BOOST', action: () => setCurrentView('tasks') },
    { title: 'Reclama un bono', description: 'Activa recompensas disponibles', action: () => setCurrentView('bonuses') },
    { title: 'Invita a un amigo', description: 'Gana más por referidos', action: () => setCurrentView('referrals') }
  ];
  const achievements = [
    { title: 'Racha activa', text: `${streakValue} días seguidos` },
    { title: 'Plan actual', text: userPlan.name },
    { title: 'Retiro', text: canWithdrawNow ? 'Disponible' : 'Pendiente' }
  ];

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/referidos') || path.includes('/dashboard/referrals')) {
      setCurrentView('referrals');
    }

    const loadUserData = async () => {
      const planData = {
        name: user?.plan_name || 'Free',
        dailyTasks: user?.plan_name === 'Starter' ? 5 : user?.plan_name === 'Pro' ? 10 : user?.plan_name === 'Elite' ? 20 : 3,
        bonus: user?.plan_name === 'Starter' ? 10 : user?.plan_name === 'Pro' ? 20 : user?.plan_name === 'Elite' ? 25 : 0,
        weeklyLimit: user?.plan_name === 'Starter' ? 10 : user?.plan_name === 'Pro' ? 20 : user?.plan_name === 'Elite' ? 40 : 5,
        expiryDate: user?.plan_expiry_date || null,
        daysRemaining: user?.plan_expiry_date ? calculateDaysRemaining(user.plan_expiry_date) : 0
      };

      setUserPlan(planData);
      setUserBalance({
        purchased: Number(user?.purchased_boost) || 0,
        earned: Number(user?.earned_boost) || 0,
        wallet: Number(user?.balance) || 0,
        weeklyLimit: Number(planData.weeklyLimit) || 0,
        currentWeekWithdrawn: Number(user?.current_week_withdrawn) || 0,
        nextWithdrawalDate: calculateNextWithdrawalDate()
      });
    };
    loadUserData();
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDepositClick = () => {
    navigate('/deposit');
  };

  const handleGoToWithdraw = () => {
    console.log('handleGoToWithdraw called');
    try {
      navigate('/withdraw');
    } catch (e) {
      console.error('navigate failed:', e);
    }
    // Fallback forcible navigation (useful for debugging if SPA navigation fails)
    try {
      window.location.href = '/withdraw';
    } catch (e) {
      console.error('window.location fallback failed:', e);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#eef8ff_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-xl md:px-8" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-900)] text-lg font-bold text-white">
              B
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--brand-900)] sm:text-2xl">BoostMe</h1>
              <p className="text-sm text-slate-500">Tu panel diario</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {(user?.has_financial_activation || userPlan.name !== 'Free') && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 shadow-sm">
                Plan {userPlan.name}
              </span>
            )}
            <button
              className="hidden rounded-lg bg-[var(--brand-900)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#111c33] md:inline-flex"
              onClick={handleLogout}
            >
              Cerrar Sesión
            </button>
            <button
              className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-[var(--brand-900)] shadow-sm md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menú"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <p className="mx-auto mt-3 max-w-7xl text-center text-sm font-semibold text-[var(--brand-900)] sm:text-base md:text-left">
          ¡Hola, {user?.username || "Usuario"}!
        </p>

        <nav className="mx-auto mt-4 hidden max-w-7xl md:flex md:justify-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${currentView === 'dashboard' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <Wallet className="h-5 w-5" />
              <span>Inicio</span>
            </button>
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${currentView === 'tasks' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => setCurrentView('tasks')}
            >
              <Target className="h-5 w-5" />
              <span>Tareas</span>
            </button>
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${currentView === 'referrals' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => setCurrentView('referrals')}
            >
              <Users className="h-5 w-5" />
              <span>Referidos</span>
            </button>
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${currentView === 'profile' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => setCurrentView('profile')}
            >
              <Users className="h-5 w-5" />
              <span>Perfil</span>
            </button>
            <button
              onClick={handleDepositClick}
              className="flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)]"
            >
              <Crown className="h-4 w-4" />
              <span>Planes</span>
            </button>
            <button
              onClick={() => setCurrentView('bonuses')}
              className="flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)]"
            >
              <Gift className="h-4 w-4" />
              <span>Bonos</span>
            </button>
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`fixed right-0 top-0 z-30 flex h-screen w-[82vw] max-w-[300px] flex-col gap-4 bg-white px-4 py-6 shadow-2xl transition-all duration-300 md:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between rounded-3xl bg-[var(--brand-700)] px-4 py-4 text-white shadow-sm">
          <p className="text-base font-semibold">¡Hola, {user?.username || "Usuario"}!</p>
          <button onClick={() => setMenuOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--brand-900)] transition hover:bg-slate-100"><X /></button>
        </div>

        <button 
          className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-gray-700 transition hover:bg-slate-100 ${currentView === 'dashboard' ? 'bg-sky-50 font-semibold text-[var(--brand-900)]' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('dashboard');
            setMenuOpen(false);
          }}
        >
          <Wallet className="mr-2 h-5 w-5" /> Inicio
        </button>
        <button 
          className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-gray-700 transition hover:bg-slate-100 ${currentView === 'tasks' ? 'bg-sky-50 font-semibold text-[var(--brand-900)]' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('tasks');
            setMenuOpen(false);
          }}
        >
          <Target className="mr-2 h-5 w-5" /> Tareas
        </button>
        <button 
          className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-gray-700 transition hover:bg-slate-100 ${currentView === 'referrals' ? 'bg-sky-50 font-semibold text-[var(--brand-900)]' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('referrals');
            setMenuOpen(false);
          }}
        >
          <Users className="mr-2 h-5 w-5" /> Referidos
        </button>
        <button 
          className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-gray-700 transition hover:bg-slate-100 ${currentView === 'bonuses' ? 'bg-sky-50 font-semibold text-[var(--brand-900)]' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('bonuses');
            setMenuOpen(false);
          }}
        >
          <Gift className="mr-2 h-5 w-5" /> Bonos
        </button>
        <button 
          className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-gray-700 transition hover:bg-slate-100 ${currentView === 'profile' ? 'bg-sky-50 font-semibold text-[var(--brand-900)]' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('profile');
            setMenuOpen(false);
          }}
        >
          <Users className="mr-2 h-5 w-5" /> Perfil
        </button>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              handleDepositClick();
              setMenuOpen(false);
            }}
            className="rounded-2xl bg-sky-50 px-3 py-3 text-sm font-semibold text-[var(--brand-900)] transition hover:bg-sky-100"
          >
            Planes
          </button>
          <button
            onClick={() => {
              setCurrentView('bonuses');
              setMenuOpen(false);
            }}
            className="rounded-2xl bg-sky-50 px-3 py-3 text-sm font-semibold text-[var(--brand-900)] transition hover:bg-sky-100"
          >
            Bonos
          </button>
          <button
            onClick={() => {
              setCurrentView('tasks');
              setMenuOpen(false);
            }}
            className="rounded-2xl bg-sky-50 px-3 py-3 text-sm font-semibold text-[var(--brand-900)] transition hover:bg-sky-100"
          >
            Tareas
          </button>
        </div>

        <button className="rounded-xl bg-[var(--brand-900)] px-3 py-3 text-sm font-semibold text-white transition hover:bg-[#111c33]" onClick={handleLogout}>Cerrar Sesión</button>
      </aside>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-8">
        {currentView === 'dashboard' && (
          <>
            <div className="grid w-full max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="w-full rounded-3xl bg-gradient-to-br from-[var(--brand-700)] to-[var(--brand-900)] p-4 shadow-xl sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-100/80 sm:text-base">Saldo Total BOOST</p>
                    <p className="text-3xl font-bold text-white sm:text-4xl">
                      {userBalance.purchased + userBalance.earned}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-500 sm:text-sm">BOOST Comprados</p>
                    <p className="font-semibold text-gray-800">{userBalance.purchased}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 sm:text-sm">BOOST Ganados</p>
                    <p className="font-semibold text-gray-800">{userBalance.earned}</p>
                  </div>
                </div>

                <div className="mt-4 text-center sm:text-left">
                  <p className="text-sm sm:text-base">{canWithdrawNow ? 'Retiro disponible ahora' : 'Próximo retiro disponible'}</p>
                  <p className="text-base font-semibold text-slate-800 sm:text-lg">{userBalance.nextWithdrawalDate}</p>
                  <p className="text-sm sm:text-base">{userBalance.currentWeekWithdrawn} / {userBalance.weeklyLimit} BOOST</p>
                  <button
                    className="mt-3 w-full max-w-56 rounded-lg bg-[var(--brand-900)] px-4 py-2 text-white transition-all duration-200 hover:bg-[#111c33] sm:w-3/5"
                    onClick={(e) => { console.log('Retirar button clicked'); handleGoToWithdraw(); }}
                  >
                    Retirar BOOST
                  </button>
                  <p className="mt-2 text-xs text-gray-500">Saldo en wallet: {userBalance.wallet.toFixed(2)} USDT</p>
                </div>
              </div>

              <div className="w-full rounded-3xl bg-white p-4 shadow-sm sm:p-6 border border-slate-200">
                <h2 className="text-lg font-semibold text-[var(--brand-900)] sm:text-xl">Estado del Plan</h2>
                <div className="mt-4 space-y-3 text-sm sm:text-base">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">Plan Actual</span>
                    <span className="font-semibold text-slate-900">{userPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">Tareas diarias</span>
                    <span className="font-semibold text-slate-900">{userPlan.dailyTasks}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">Bonus</span>
                    <span className="font-semibold text-slate-900">+{userPlan.bonus}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">Días restantes</span>
                    <span className="font-semibold text-slate-900">{userPlan.daysRemaining} días</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">Límite de retiro</span>
                    <span className="font-semibold text-slate-900">{userPlan.weeklyLimit} BOOST/semana</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full border border-slate-200">
                <h2 className="text-xl md:text-2xl text-[var(--brand-900)]">Resumen de hoy</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-[var(--brand-900)]">
                      <Flame className="text-[var(--brand-700)]" size={16} />
                      <span>Racha</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{streakValue} días</p>
                    <p className="text-sm text-slate-500">Tu progreso sigue en marcha</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-[var(--brand-900)]">
                      <TrendingUp className="text-[var(--brand-700)]" size={16} />
                      <span>Progreso semanal</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{progressPercent}%</p>
                    <p className="text-sm text-slate-500">Meta de BOOST acumulado</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-[var(--brand-900)]">
                      <Clock3 className="text-[var(--brand-700)]" size={16} />
                      <span>Próximo retiro</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{userBalance.nextWithdrawalDate || '—'}</p>
                    <p className="text-sm text-slate-500">Revisa tu disponibilidad</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full border border-slate-200">
                <h2 className="text-xl md:text-2xl text-[var(--brand-900)]">Acciones recomendadas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {recommendedActions.map((item) => (
                    <button
                      key={item.title}
                      onClick={item.action}
                      className="group bg-white rounded-2xl p-4 shadow-sm border border-sky-100 text-left transition hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 group-hover:text-[var(--brand-900)]">{item.title}</h3>
                        <ArrowRight className="text-[var(--brand-700)] transition group-hover:text-[var(--brand-900)]" size={16} />
                      </div>
                      <p className="text-sm text-slate-500">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full border border-slate-200">
                <h2 className="text-xl md:text-2xl text-[var(--brand-900)]">Logros recientes</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {achievements.map((item) => (
                    <div key={item.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
                      <CheckCircle2 className="text-emerald-500 mt-1" size={18} />
                      <div>
                        <p className="font-semibold text-gray-800">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        
        {currentView === 'tasks' && <TasksList />}
        {currentView === 'referrals' && <Referidos />}
        {currentView === 'bonuses' && <Bonuses />}
        {currentView === 'profile' && <Profile />}
      </main>
    </div>
  );
};

export default Dashboard;
