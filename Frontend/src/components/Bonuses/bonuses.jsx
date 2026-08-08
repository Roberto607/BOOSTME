import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, TrendingUp, Award, Clock, Flame, Check, Star, ArrowRight, Loader2 } from 'lucide-react';
import { BONUSES_API_BASE_URL } from "../../Base";
import { useAuth } from '../../contexts/AuthContext';

const Bonuses = () => {
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useAuth();
  
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showBonuses, setShowBonuses] = useState(false);
  const [bonuses, setBonuses] = useState([]);
  const [userBonuses, setUserBonuses] = useState([]);
  const [userStreak, setUserStreak] = useState({
    current_streak: 3,
    max_streak: 7
  });
  const [bonusStats, setBonusStats] = useState({
    totalEarned: 150,
    pendingCount: 2,
    claimedCount: 5
  });

  const mapBonusToUi = (bonus) => ({
    id: bonus.id,
    name: bonus.name,
    value: Number(bonus.value || 0),
    description: bonus.description || 'Sin descripción',
    requirement_value: Number(bonus.requirement_value || 0),
    current_progress: 0,
    isSpecial: bonus.bonus_type === 'streak' || bonus.bonus_type === 'referral',
    isAvailable: Boolean(bonus.is_active),
    bonus_type: bonus.bonus_type,
    features: Array.isArray(bonus.features) ? bonus.features : []
  });

  const buildAuthHeaders = () => {
    const headers = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  };

  useEffect(() => {
    const loadBonuses = async () => {
      try {
        setBonuses([]);
        setShowBonuses(true);

        const bonusesRes = await fetch(`${BONUSES_API_BASE_URL}/bonus-types/`, {
          credentials: 'include',
          headers: buildAuthHeaders()
        });

        if (bonusesRes.ok) {
          const bonusesData = await bonusesRes.json();
          const normalizedBonuses = Array.isArray(bonusesData?.results)
            ? bonusesData.results
            : Array.isArray(bonusesData)
              ? bonusesData
              : null;
          if (normalizedBonuses && normalizedBonuses.length > 0) {
            setBonuses(normalizedBonuses.map(mapBonusToUi));
          } else if (Array.isArray(bonusesData)) {
            setBonuses(bonusesData.map(mapBonusToUi));
          }
        }

        if (!isAuthenticated || !user) {
          return;
        }

        const [userBonusesRes, streakRes] = await Promise.all([
          fetch(`${BONUSES_API_BASE_URL}/user-bonuses/`, { credentials: 'include', headers: buildAuthHeaders() }),
          fetch(`${BONUSES_API_BASE_URL}/user-streak/current/`, { credentials: 'include', headers: buildAuthHeaders() })
        ]);

        if (userBonusesRes.ok) {
          const userBonusesData = await userBonusesRes.json();
          const normalizedUserBonuses = Array.isArray(userBonusesData?.results)
            ? userBonusesData.results
            : Array.isArray(userBonusesData)
              ? userBonusesData
              : [];
          setUserBonuses(normalizedUserBonuses);
        }

        if (streakRes.ok) {
          const streakData = await streakRes.json();
          const normalizedStreak = Array.isArray(streakData)
            ? streakData[0] || {}
            : (streakData || {});
          setUserStreak(normalizedStreak);
        }

        try {
          const statsRes = await fetch(`${BONUSES_API_BASE_URL}/user-bonuses/bonus_stats/`, {
            credentials: 'include',
            headers: buildAuthHeaders()
          });

          if (statsRes.ok) {
            const stats = await statsRes.json();
            setBonusStats(stats);
          }
        } catch (statsError) {
          console.log('Stats endpoint not available, using example data');
        }
      } catch (error) {
        console.error('Error loading bonuses:', error);
        setError('Error al cargar los datos de bonos');
      }
    };

    loadBonuses();
  }, [isAuthenticated, user]);

  const claimBonus = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (!isAuthenticated || !user) {
      setIsLoading(false);
      navigate('/login', { state: { from: '/bonuses' } });
      return;
    }

    try {
      const response = await fetch(`${BONUSES_API_BASE_URL}/user-bonuses/claim_bonus/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bonus_id: selectedBonus.id })
      });

      if (response.status === 401) {
        setError('Debes iniciar sesión para reclamar bonos.');
        navigate('/login', { state: { from: '/bonuses' } });
        return;
      }

      if (response.ok) {
        setMessage(`¡Bono ${selectedBonus.name} reclamado exitosamente!`);
        setBonuses(prevBonuses => 
          prevBonuses.map(bonus => 
            bonus.id === selectedBonus.id 
              ? { ...bonus, current_progress: bonus.requirement_value }
              : bonus
          )
        );
        
        setTimeout(() => {
          setSelectedBonus(null);
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al reclamar el bono");
      }
    } catch (error) {
      console.error('Error claiming bonus:', error);
      setError("Error al procesar la solicitud");
    }

    setIsLoading(false);
  };

  if (!showBonuses) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600">Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* HEADER */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-1">
          ¡Bonos Especiales!
        </h1>
        <p className="text-gray-500">
          Completa retos y gana BOOST extra
        </p>

        {!isAuthenticated && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Mira los bonos aquí. Inicia sesión para abrir uno y reclamar tus recompensas.
          </div>
        )}

        {userStreak && (
          <div className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <span className="text-base">🔥</span>
            <span>Racha actual: {userStreak.current_streak} días</span>
          </div>
        )}
      </div>

      {/* BONOS */}
      {showBonuses && !selectedBonus && (
        <div>
          <h2 className="text-center text-xl font-semibold mb-6">
            Selecciona un Bono
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bonuses.map((bonus) => (
              <div
                key={bonus.id}
                onClick={() => {
                  if (!isAuthenticated || !user) {
                    navigate('/login', { state: { from: '/bonuses' } });
                    return;
                  }
                  setSelectedBonus(bonus);
                }}
                className="relative bg-white rounded-2xl p-6 shadow hover:-translate-y-1 hover:shadow-lg transition cursor-pointer border border-slate-200"
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {bonus.isSpecial && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <Star className="w-3.5 h-3.5" /> Especial
                    </span>
                  )}

                  {bonus.isAvailable && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <Gift className="w-3.5 h-3.5" /> Disponible
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-2">{bonus.name}</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  +{bonus.value} BOOST
                </p>

                <p className="text-gray-600 mb-4">{bonus.description}</p>

                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(bonus.current_progress / bonus.requirement_value) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {bonus.current_progress}/{bonus.requirement_value} completado
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  {bonus.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <Check className="w-4 h-4 text-sky-600" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800">
                  Seleccionar <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM */}
      {selectedBonus && (
        <form
          onSubmit={claimBonus}
          className="bg-white p-6 rounded-2xl shadow max-w-md mx-auto w-full"
        >
          <div className="flex justify-between bg-gray-100 p-4 rounded-lg mb-4">
            <strong>{selectedBonus.name}</strong>
            <button
              type="button"
              onClick={() => setSelectedBonus(null)}
              className="text-blue-600 font-semibold"
            >
              Cambiar
            </button>
          </div>

          {message && (
            <div className="bg-emerald-100 text-emerald-700 p-3 rounded mb-3 text-center">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-3 text-center">
              {error}
            </div>
          )}

          <div className="mb-4">
            <p className="text-gray-600 mb-2">{selectedBonus.description}</p>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span>Progreso</span>
                <span>{selectedBonus.current_progress}/{selectedBonus.requirement_value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(selectedBonus.current_progress / selectedBonus.requirement_value) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || selectedBonus.current_progress < selectedBonus.requirement_value}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              selectedBonus.current_progress >= selectedBonus.requirement_value
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? "Procesando..." : 
             selectedBonus.current_progress >= selectedBonus.requirement_value
             ? "Reclamar Bono"
             : "Completar requisitos"
            }
          </button>
        </form>
      )}
    </div>
  );
};

export default Bonuses;
