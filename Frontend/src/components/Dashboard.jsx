import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  Target, 
  Gift, 
  Users, 
  Star,
  Trophy,
  Menu,
  X
} from 'lucide-react';
import './Dashboard.css';
import Profile from './Perfil/Profile';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const [userBalance, setUserBalance] = useState({
    purchased: 0,
    earned: 0,
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

  const [dailyTasks, setDailyTasks] = useState({
    completed: 0,
    total: 3,
    earnings: 0
  });

  // Calcular días restantes del plan
  const calculateDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = Math.abs(expiry - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calcular próxima fecha de retiro
  const calculateNextWithdrawalDate = () => {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toLocaleDateString();
  };

  useEffect(() => {
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
        purchased: user?.purchased_boost || 0,
        earned: user?.earned_boost || 0,
        weeklyLimit: planData.weeklyLimit,
        currentWeekWithdrawn: user?.current_week_withdrawn || 0,
        nextWithdrawalDate: calculateNextWithdrawalDate()
      });
      setDailyTasks({
        completed: user?.tasks_completed_today || 0,
        total: planData.dailyTasks,
        earnings: user?.earnings_today || 0
      });
    };
    loadUserData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDepositClick = () => {
    navigate('/deposit');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-top">
          <h1>BoostMe</h1>

          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>

          <div className="user-info">
            <span className="plan-badge">Plan {userPlan.name}</span>
            <button onClick={handleLogout} className="logout-button">
              Cerrar Sesión
            </button>
          </div>
        </div>

        <p className="saludo">¡Hola, {user?.username || "Padre"}!</p>

        <nav className="top-nav">
          <button 
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <Wallet className="nav-icon" />
            <span>Inicio</span>
          </button>
          <button className="nav-button">
            <Target className="nav-icon" />
            <span>Tareas</span>
          </button>
          <button className="nav-button">
            <TrendingUp className="nav-icon" />
            <span>Estadísticas</span>
          </button>
          <button 
            className={`nav-button ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentView('profile')}
          >
            <Users className="nav-icon" />
            <span>Perfil</span>
          </button>
        </nav>
      </header>

      <aside className={`side-menu ${menuOpen ? 'open' : ''}`}>
        <button onClick={() => setMenuOpen(false)} className="menu-close"><X /></button>
        <p className="saludo-side">¡Hola, {user?.username || "Padre"}!</p>
        
        <button 
          className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('dashboard');
            setMenuOpen(false);
          }}
        >
          <Wallet /> Inicio
        </button>
        <button className="nav-button">
          <Target /> Tareas
        </button>
        <button className="nav-button">
          <TrendingUp /> Estadísticas
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
        {currentView === 'dashboard' ? (
          <>
            <div className="balance-card">
              <div className="balance-header">
                <div>
                  <p className="balance-label">Saldo Total BOOST</p>
                  <p className="balance-amount">
                    {userBalance.purchased + userBalance.earned}
                  </p>
                </div>
                <Wallet className="balance-icon" />
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
                <p className="withdraw-label">Próximo retiro disponible</p>
                <p className="withdraw-date">{userBalance.nextWithdrawalDate}</p>
                <p className="withdraw-amount">
                  {userBalance.currentWeekWithdrawn} / {userBalance.weeklyLimit} BOOST
                </p>
                <button 
                  className="withdraw-button"
                  disabled={userBalance.currentWeekWithdrawn >= userBalance.weeklyLimit}
                >
                  {userBalance.currentWeekWithdrawn >= userBalance.weeklyLimit 
                    ? 'Límite alcanzado' 
                    : 'Retirar BOOST'
                  }
                </button>
              </div>
            </div>

            <div className="tasks-card">
              <div className="tasks-header">
                <h2>Tareas Diarias</h2>
                <span className="tasks-counter">
                  {dailyTasks.completed}/{dailyTasks.total}
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(dailyTasks.completed / dailyTasks.total) * 100}%` }}
                />
              </div>
              <div className="earnings-info">
                <p>Ganado hoy</p>
                <p className="earnings-amount">{dailyTasks.earnings} BOOST</p>
              </div>
            </div>

            <div className="quick-actions">
              <h2>Acciones Rápidas</h2>
              <div className="actions-grid">
                <button 
                  className="action-button"
                  onClick={handleDepositClick}
                >
                  <Wallet className="action-icon" />
                  <span>Depositar</span>
                </button>
                <button className="action-button">
                  <Gift className="action-icon" />
                  <span>Bonos</span>
                </button>
                <button className="action-button">
                  <Users className="action-icon" />
                  <span>Referidos</span>
                </button>
                <button className="action-button">
                  <Trophy className="action-icon" />
                  <span>Retos</span>
                </button>
              </div>
            </div>

            <div className="plan-card">
              <div className="plan-header">
                <h2>Estado del Plan</h2>
                <Star className="plan-star" />
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
              <button className="upgrade-button">Actualizar Plan</button>
            </div>
          </>
        ) : (
          <Profile />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
