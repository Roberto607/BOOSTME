import React, { useState, useEffect } from 'react';
import { Gift, TrendingUp, Award, Clock, Flame, Check, Star, ArrowRight, Loader2 } from 'lucide-react';
import { BONUSES_API_BASE_URL } from "../../Base";
import { useAuth } from '../../contexts/AuthContext';

const Bonuses = () => {
  const { user, accessToken } = useAuth();
  
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

  // Datos de ejemplo para los bonos
  const exampleBonuses = [
    {
      id: 1,
      name: "Bono de Racha Diaria",
      value: 10,
      description: "Mantén una racha de 7 días consecutivos",
      requirement_value: 7,
      current_progress: 3,
      isSpecial: true,
      isAvailable: true,
      bonus_type: "streak",
      features: [
        "+10 BOOST al completar",
        "Multiplicador x2 en tareas",
        "Bono extra cada 14 días",
        "Acceso a tareas exclusivas"
      ]
    },
    {
      id: 2,
      name: "Bono de Tareas Extra",
      value: 25,
      description: "Completa 50 tareas en una semana",
      requirement_value: 50,
      current_progress: 32,
      isSpecial: false,
      isAvailable: true,
      bonus_type: "tasks",
      features: [
        "+25 BOOST al completar",
        "Tareas premium desbloqueadas",
        "Doble recompensa en fines de semana",
        "Sin límite de tareas diarias"
      ]
    },
    {
      id: 3,
      name: "Bono de Referidos",
      value: 50,
      description: "Consigue 5 nuevos referidos activos",
      requirement_value: 5,
      current_progress: 2,
      isSpecial: true,
      isAvailable: false,
      bonus_type: "referrals",
      features: [
        "+50 BOOST por cada referido",
        "15% extra de comisión",
        "Bono de equipo mensual",
        "Acceso a programa VIP"
      ]
    },
    {
      id: 4,
      name: "Bono de Super Usuario",
      value: 100,
      description: "Alcanza el nivel Elite completando 100 tareas",
      requirement_value: 100,
      current_progress: 78,
      isSpecial: true,
      isAvailable: true,
      bonus_type: "achievement",
      features: [
        "+100 BOOST al completar",
        "Retiros instantáneos",
        "Soporte prioritario",
        "Acceso a eventos exclusivos"
      ]
    }
  ];

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
        // Siempre mostrar los datos de ejemplo primero
        // Siempre mostrar los datos de ejemplo primero
        setBonuses(exampleBonuses);
        setShowBonuses(true);
        // Intentar cargar datos de la API usando cookies
        try {
          const [bonusesRes, userBonusesRes, streakRes] = await Promise.all([
            fetch(`${BONUSES_API_BASE_URL}/bonus-types/`, { credentials: 'include', headers: buildAuthHeaders() }),
            fetch(`${BONUSES_API_BASE_URL}/user-bonuses/`, { credentials: 'include', headers: buildAuthHeaders() }),
            fetch(`${BONUSES_API_BASE_URL}/user-streak/`, { credentials: 'include', headers: buildAuthHeaders() })
          ]);

          if (bonusesRes.ok) {
            const bonusesData = await bonusesRes.json();
            const normalizedBonuses = Array.isArray(bonusesData?.results)
              ? bonusesData.results
              : Array.isArray(bonusesData)
                ? bonusesData
                : null;
            if (normalizedBonuses && normalizedBonuses.length > 0) {
              setBonuses(normalizedBonuses);
            }
          }

          if (userBonusesRes.ok) {
            const userBonusesData = await userBonusesRes.json();
            const normalizedUserBonuses = Array.isArray(userBonusesData?.results)
              ? userBonusesData.results
              : Array.isArray(userBonusesData)
                ? userBonusesData
                : null;
            if (normalizedUserBonuses) {
              setUserBonuses(normalizedUserBonuses);
            }
          }

          if (streakRes.ok) {
            const streakData = await streakRes.json();
            const normalizedStreak = streakData?.results?.[0] || streakData;
            if (normalizedStreak) {
              setUserStreak(normalizedStreak);
            }
          }

          // Intentar cargar estadísticas si el endpoint existe
          try {
            const statsRes = await fetch(`${BONUSES_API_BASE_URL}/user-bonuses/bonus_stats/`, { credentials: 'include', headers: buildAuthHeaders() });

            if (statsRes.ok) {
              const stats = await statsRes.json();
              setBonusStats(stats);
            }
          } catch (statsError) {
            console.log('Stats endpoint not available, using example data');
          }
        } catch (apiError) {
          console.log('API not available, using example data');
        }
      } catch (error) {
        console.error('Error loading bonuses:', error);
        setError('Error al cargar los datos de bonos');
      }
    };

    loadBonuses();
  }, []);

  const claimBonus = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${BONUSES_API_BASE_URL}/user-bonuses/claim_bonus/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bonus_id: selectedBonus.id })
      });

      if (response.ok) {
        setMessage(`¡Bono ${selectedBonus.name} reclamado exitosamente!`);
        // Actualizar el progreso del bono
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

        {userStreak && (
          <p className="text-emerald-500 font-semibold mt-2">
            Racha actual: {userStreak.current_streak} días 🔥
          </p>
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
                onClick={() => setSelectedBonus(bonus)}
                className={`relative bg-white rounded-2xl p-6 shadow hover:-translate-y-1 hover:shadow-lg transition cursor-pointer
                  ${bonus.isSpecial && "border-2 border-blue-600"}
                  ${bonus.isAvailable && "border-2 border-emerald-500"}
                `}
              >
                {bonus.isSpecial && (
                  <span className="absolute -top-3 right-5 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex gap-1 items-center">
                    <Star className="w-4 h-4" /> Especial
                  </span>
                )}

                {bonus.isAvailable && (
                  <span className="absolute -top-3 right-5 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm flex gap-1 items-center">
                    <Gift className="w-4 h-4" /> Disponible
                  </span>
                )}

                <h3 className="text-lg font-bold mb-2">{bonus.name}</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  +{bonus.value} BOOST
                </p>

                <p className="text-gray-600 mb-4">{bonus.description}</p>

                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
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
                      <Check className="w-4 h-4 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-blue-700">
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
                ? 'bg-blue-600 text-white hover:bg-blue-700'
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
