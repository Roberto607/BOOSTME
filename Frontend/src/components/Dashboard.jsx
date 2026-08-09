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
    <div className="flex flex-col min-h-screen bg-[var(--bg)]">
      <header className="bg-white shadow-sm px-4 md:px-8 py-4 relative z-10" style={{ borderBottom: '1px solid rgba(56,189,248,0.15)' }}>
        <div className="header-top">
          <h1 className="text-2xl md:text-3xl">BoostMe</h1>

          <button
            className="menu-button md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>

          <div className="hidden md:flex items-center gap-4">
            {(user?.has_financial_activation || userPlan.name !== 'Free') && (
              <span className="px-3 py-1 rounded-full font-semibold text-sm" style={{ background: 'rgba(56,189,248,0.14)', color: 'var(--brand-900)' }}>Plan {userPlan.name}</span>
            )}
            <button onClick={handleLogout} className="text-white rounded-lg px-3 py-1 cursor-pointer transition-all duration-200" style={{ background: 'var(--brand-900)' }}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        <p className="text-center font-semibold mt-2 text-[var(--brand-900)] text-base md:text-lg">¡Hola, {user?.username || "Usuario"}!</p>

        <nav className="hidden md:flex justify-center gap-4 md:gap-8 mt-4">
          <button 
            className={`flex items-center gap-1 cursor-pointer text-gray-600 font-semibold transition-all duration-200 ${currentView === 'dashboard' ? 'text-[var(--brand-900)]' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <Wallet className="w-5 h-5" />
            <span className="hidden md:inline">Inicio</span>
          </button>
          <button 
            className={`flex items-center gap-1 cursor-pointer text-gray-600 font-semibold transition-all duration-200 ${currentView === 'tasks' ? 'text-[var(--brand-900)]' : ''}`}
            onClick={() => setCurrentView('tasks')}
          >
            <Target className="w-5 h-5" />
            <span className="hidden md:inline">Tareas</span>
          </button>
          <button 
            className={`flex items-center gap-1 cursor-pointer text-gray-600 font-semibold transition-all duration-200 ${currentView === 'referrals' ? 'text-[var(--brand-900)]' : ''}`}
            onClick={() => setCurrentView('referrals')}
          >
            <Users className="w-5 h-5" />
            <span className="hidden md:inline">Referidos</span>
          </button>
        
          <button 
            className={`flex items-center gap-1 cursor-pointer text-gray-600 font-semibold transition-all duration-200 ${currentView === 'profile' ? 'text-[var(--brand-900)]' : ''}`}
            onClick={() => setCurrentView('profile')}
          >
            <Users className="w-5 h-5" />
            <span className="hidden md:inline">Perfil</span>
          </button>
        </nav>
      </header>

      <aside className={`fixed top-0 ${menuOpen ? 'left-0' : '-left-64'} w-60 h-screen bg-white shadow-lg px-4 py-8 transition-all duration-300 flex flex-col gap-4 z-20 md:hidden`}>
        <button onClick={() => setMenuOpen(false)} className="self-end bg-transparent border-0 cursor-pointer text-[var(--brand-900)]"><X /></button>
        <p className="text-center font-semibold mb-4 text-[var(--brand-900)]">¡Hola, {user?.username || "Usuario"}!</p>
        
        <button 
          className={`flex items-center gap-2 text-gray-700 cursor-pointer ${currentView === 'dashboard' ? 'text-[var(--brand-900)] font-semibold' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('dashboard');
            setMenuOpen(false);
          }}
        >
          <Wallet className="w-5 h-5 mr-2" /> Inicio
        </button>
        <button 
          className={`flex items-center gap-2 text-gray-700 cursor-pointer ${currentView === 'tasks' ? 'text-[var(--brand-900)] font-semibold' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('tasks');
            setMenuOpen(false);
          }}
        >
          <Target className="w-5 h-5 mr-2" /> Tareas
        </button>
        <button 
          className={`flex items-center gap-2 text-gray-700 cursor-pointer ${currentView === 'referrals' ? 'text-[var(--brand-900)] font-semibold' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('referrals');
            setMenuOpen(false);
          }}
        >
          <Users className="w-5 h-5 mr-2" /> Referidos
        </button>
        <button 
          className={`flex items-center gap-2 text-gray-700 cursor-pointer ${currentView === 'bonuses' ? 'text-[var(--brand-900)] font-semibold' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('bonuses');
            setMenuOpen(false);
          }}
        >
          <Gift className="w-5 h-5 mr-2" /> Bonos
        </button>
        <button 
          className={`flex items-center gap-2 text-gray-700 cursor-pointer ${currentView === 'profile' ? 'text-[var(--brand-900)] font-semibold' : 'font-medium'}`}
          onClick={() => {
            setCurrentView('profile');
            setMenuOpen(false);
          }}
        >
          <Users className="w-5 h-5 mr-2" /> Perfil
        </button>

        <button className="mt-auto text-white rounded-lg px-2 py-1.5 bg-[var(--brand-900)]" onClick={handleLogout}>Cerrar Sesión</button>
      </aside>

      <main className="flex flex-col items-center gap-5 px-4 md:px-8 py-4 md:py-8">
        {currentView === 'dashboard' && (
          <>
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full md:col-span-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm md:text-base">Saldo Total BOOST</p>
                  <p className="font-bold text-[var(--brand-900)] text-3xl md:text-4xl">
                    {userBalance.purchased + userBalance.earned}
                  </p>
                </div>
                <Wallet className="text-[var(--brand-700)] w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div className="flex justify-between mt-4">
                <div>
                  <p className="text-xs md:text-sm text-gray-500">BOOST Comprados</p>
                  <p className="font-semibold text-gray-800">{userBalance.purchased}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-500">BOOST Ganados</p>
                  <p className="font-semibold text-gray-800">{userBalance.earned}</p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm md:text-base">{canWithdrawNow ? 'Retiro disponible ahora' : 'Próximo retiro disponible'}</p>
                <p className="text-base md:text-lg">{userBalance.nextWithdrawalDate}</p>
                <p className="text-sm md:text-base">{userBalance.currentWeekWithdrawn} / {userBalance.weeklyLimit} BOOST</p>
                <button
                  className="w-full md:w-3/5 max-w-56 text-white rounded-lg px-4 py-2 mt-2 bg-[var(--brand-900)] hover:bg-[#111c33] transition-all duration-200"
                  onClick={(e) => { console.log('Retirar button clicked'); handleGoToWithdraw(); }}
                >
                  Retirar BOOST
                </button>
                <p className="text-xs text-gray-500 mt-2">Saldo en wallet: {userBalance.wallet.toFixed(2)} USDT</p>
              </div>
              </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full">
              <h2 className="text-xl md:text-2xl">Resumen de hoy</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Flame size={18} />
                    <span className="font-semibold">Racha</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{streakValue} días</p>
                  <p className="text-sm text-gray-500">Tu progreso sigue en marcha</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <TrendingUp size={18} />
                    <span className="font-semibold">Progreso semanal</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{progressPercent}%</p>
                  <p className="text-sm text-gray-500">Meta de BOOST acumulado</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Clock3 size={18} />
                    <span className="font-semibold">Próximo retiro</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{userBalance.nextWithdrawalDate || '—'}</p>
                  <p className="text-sm text-gray-500">Revisa tu disponibilidad</p>
                </div>
                </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full">
              <h2 className="text-xl md:text-2xl">Acciones recomendadas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {recommendedActions.map((item) => (
                  <button
                    key={item.title}
                    onClick={item.action}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:-translate-y-1 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">{item.title}</h3>
                      <ArrowRight className="text-blue-600" size={16} />
                    </div>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </button>
                ))}
                </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full">
              <h2 className="text-xl md:text-2xl">Logros recientes</h2>
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

                <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full">
              <h2 className="text-xl md:text-2xl">Acciones Rápidas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  className="flex flex-col items-center gap-1 bg-gray-100 rounded-xl p-4 cursor-pointer font-semibold text-gray-900 transition-all duration-200 hover:bg-[rgba(56,189,248,0.12)]"
                  onClick={handleDepositClick}
                >
                  <Crown className="text-[var(--brand-700)] w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Planes</span>
                </button>
                <button 
                  className="flex flex-col items-center gap-1 bg-gray-100 rounded-xl p-4 cursor-pointer font-semibold text-gray-900 transition-all duration-200 hover:bg-[rgba(56,189,248,0.12)]" 
                  onClick={() => setCurrentView('bonuses')}
                >
                  <Gift className="text-[var(--brand-700)] w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Bonos</span>
                </button>
                <button 
                  className="flex flex-col items-center gap-1 bg-gray-100 rounded-xl p-4 cursor-pointer font-semibold text-gray-900 transition-all duration-200 hover:bg-[rgba(56,189,248,0.12)]"
                  onClick={() => setCurrentView('referrals')}
                >
                  <Users className="text-[var(--brand-700)] w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Referidos</span>
                </button>
                <button 
                  className="flex flex-col items-center gap-1 bg-gray-100 rounded-xl p-4 cursor-pointer font-semibold text-gray-900 transition-all duration-200 hover:bg-[rgba(56,189,248,0.12)]"
                  onClick={() => setCurrentView('tasks')}
                >
                  <Trophy className="text-[var(--brand-700)] w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Tareas</span>
                </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full max-w-6xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl">Estado del Plan</h2>
                <Star className="text-[var(--brand-300)] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="mt-4">
                <div className="flex justify-between mt-2 text-sm md:text-base">
                  <span>Plan Actual</span>
                  <span>{userPlan.name}</span>
                </div>
                <div className="flex justify-between mt-2 text-sm md:text-base">
                  <span>Tareas diarias</span>
                  <span>{userPlan.dailyTasks}</span>
                </div>
                <div className="flex justify-between mt-2 text-sm md:text-base">
                  <span>Bonus</span>
                  <span>+{userPlan.bonus}%</span>
                </div>
                <div className="flex justify-between mt-2 text-sm md:text-base">
                  <span>Días restantes</span>
                  <span>{userPlan.daysRemaining} días</span>
                </div>
                <div className="flex justify-between mt-2 text-sm md:text-base">
                  <span>Límite de retiro</span>
                  <span>{userPlan.weeklyLimit} BOOST/semana</span>
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
