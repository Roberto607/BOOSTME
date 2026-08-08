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
import './Dashboard.css';
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-top">
          <h1 className="text-2xl md:text-3xl">BoostMe</h1>

          <button
            className="menu-button md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>

          <div className="user-info hidden md:flex">
            {(user?.has_financial_activation || userPlan.name !== 'Free') && (
              <span className="plan-badge">Plan {userPlan.name}</span>
            )}
            <button onClick={handleLogout} className="logout-button">
              Cerrar Sesión
            </button>
          </div>
        </div>

        <p className="saludo text-base md:text-lg">¡Hola, {user?.username || "Usuario"}!</p>

        <nav className="top-nav">
          <button 
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <Wallet className="nav-icon" />
            <span className="hidden md:inline">Inicio</span>
          </button>
          <button 
            className={`nav-button ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => setCurrentView('tasks')}
          >
            <Target className="nav-icon" />
            <span className="hidden md:inline">Tareas</span>
          </button>
          <button 
            className={`nav-button ${currentView === 'referrals' ? 'active' : ''}`}
            onClick={() => setCurrentView('referrals')}
          >
            <Users className="nav-icon" />
            <span className="hidden md:inline">Referidos</span>
          </button>
        
          <button 
            className={`nav-button ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentView('profile')}
          >
            <Users className="nav-icon" />
            <span className="hidden md:inline">Perfil</span>
          </button>
        </nav>
      </header>

      <aside className={`side-menu ${menuOpen ? 'open' : ''}`}>
        <button onClick={() => setMenuOpen(false)} className="menu-close"><X /></button>
        <p className="saludo-side">¡Hola, {user?.username || "Usuario"}!</p>
        
        <button 
          className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('dashboard');
            setMenuOpen(false);
          }}
        >
          <Wallet /> Inicio
        </button>
        <button 
          className={`nav-button ${currentView === 'tasks' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('tasks');
            setMenuOpen(false);
          }}
        >
          <Target /> Tareas
        </button>
        <button 
          className={`nav-button ${currentView === 'referrals' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('referrals');
            setMenuOpen(false);
          }}
        >
          <Users /> Referidos
        </button>
        <button 
          className={`nav-button ${currentView === 'bonuses' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('bonuses');
            setMenuOpen(false);
          }}
        >
          <Gift /> Bonos
        </button>
        <button 
          className={`nav-button ${currentView === 'profile' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('profile');
            setMenuOpen(false);
          }}
        >
          <Users /> Perfil
        </button>

        <button className="logout-side" onClick={handleLogout}>Cerrar Sesión</button>
      </aside>

      <main className="main-content">
        {currentView === 'dashboard' && (
          <>
            <div className="balance-card">
              <div className="balance-header">
                <div>
                  <p className="balance-label">Saldo Total BOOST</p>
                  <p className="balance-amount text-3xl md:text-4xl">
                    {userBalance.purchased + userBalance.earned}
                  </p>
                </div>
                <Wallet className="balance-icon w-8 h-8 md:w-10 md:h-10" />
              </div>

              <div className="balance-details">
                <div className="balance-item">
                  <p className="item-label">BOOST Comprados</p>
                  <p className="item-value">{userBalance.purchased}</p>
                </div>
                <div className="balance-item">
                  <p className="item-label">BOOST Ganados</p>
                  <p className="item-value">{userBalance.earned}</p>
                </div>
              </div>

              <div className="withdraw-section">
                <p className="withdraw-label text-sm md:text-base">
                  {canWithdrawNow ? 'Retiro disponible ahora' : 'Próximo retiro disponible'}
                </p>
                <p className="withdraw-date text-base md:text-lg">{userBalance.nextWithdrawalDate}</p>
                <p className="withdraw-amount text-sm md:text-base">
                  {userBalance.currentWeekWithdrawn} / {userBalance.weeklyLimit} BOOST
                </p>
                <button 
                  className="withdraw-button"
                  onClick={(e) => { console.log('Retirar button clicked'); handleGoToWithdraw(); }}
                >
                  Retirar BOOST
                </button>
                <p className="withdraw-note text-xs text-gray-500 mt-2">
                  Saldo en wallet: {userBalance.wallet.toFixed(2)} USDT
                </p>
              </div>
            </div>

            <div className="quick-actions">
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

            <div className="quick-actions">
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

            <div className="quick-actions">
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

            <div className="quick-actions">
              <h2 className="text-xl md:text-2xl">Acciones Rápidas</h2>
              <div className="actions-grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  className="action-button"
                  onClick={handleDepositClick}
                >
                  <Crown className="action-icon w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Planes</span>
                </button>
                <button 
                  className="action-button" 
                  onClick={() => setCurrentView('bonuses')}
                >
                  <Gift className="action-icon w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Bonos</span>
                </button>
                <button 
                  className="action-button"
                  onClick={() => setCurrentView('referrals')}
                >
                  <Users className="action-icon w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Referidos</span>
                </button>
                <button 
                  className="action-button"
                  onClick={() => setCurrentView('tasks')}
                >
                  <Trophy className="action-icon w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xs md:text-sm">Tareas</span>
                </button>
              </div>
            </div>

            <div className="plan-card">
              <div className="plan-header">
                <h2 className="text-xl md:text-2xl">Estado del Plan</h2>
                <Star className="plan-star w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="plan-details">
                <div className="plan-item">
                  <span>Plan Actual</span>
                  <span>{userPlan.name}</span>
                </div>
                <div className="plan-item">
                  <span>Tareas diarias</span>
                  <span>{userPlan.dailyTasks}</span>
                </div>
                <div className="plan-item">
                  <span>Bonus</span>
                  <span>+{userPlan.bonus}%</span>
                </div>
                <div className="plan-item">
                  <span>Días restantes</span>
                  <span>{userPlan.daysRemaining} días</span>
                </div>
                <div className="plan-item">
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
