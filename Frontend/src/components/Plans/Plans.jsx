import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL, PLANS_API_BASE_URL } from "../../Base";
import { Wallet, Target, Gift, Users, Crown, Star, Check, ArrowRight, Mail, Loader2, AlertCircle } from "lucide-react";
import Web3 from "web3";

const buildPlansUrl = () => `${PLANS_API_BASE_URL}/plans/`;

const Plans = () => {
  const { user, loading, isAuthenticated, logout, setUser, setAccessToken, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(user && isAuthenticated && !loading);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch(buildPlansUrl(), { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const normalized = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
              ? data
              : [];
          setPlans(normalized);
        }
      } catch (error) {
        console.error('No se pudieron cargar los planes:', error);
      }
    };

    loadPlans();
  }, []);

  useEffect(() => {
    if (loading) return;

    setShowVerification(false);
    setShowPlans(true);
  }, [user, loading]);

  /* ========================
     WALLET
  ======================== */
  const connectWallet = async () => {
    try {
      if (!window.trustwallet) {
        setError("Instala Trust Wallet en tu navegador");
        return;
      }
      await window.trustwallet.request({ method: "eth_requestAccounts" });
      const web3Instance = new Web3(window.trustwallet);
      const accounts = await web3Instance.eth.getAccounts();
      setWeb3(web3Instance);
      setAccount(accounts[0]);
      setWalletConnected(true);
      setMessage("Wallet conectada exitosamente");
    } catch {
      setError("Error al conectar la wallet");
    }
  };

  /* ========================
     TRANSFERENCIA
  ======================== */
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const transferUSDT = async (amount) => {
    try {
      const contract = new web3.eth.Contract(
        [
          {
            constant: false,
            inputs: [
              { name: "_to", type: "address" },
              { name: "_value", type: "uint256" },
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            type: "function",
          },
        ],
        "0x55d398326f99059fF775485246999027B3197955"
      );

      const amountWei = web3.utils.toWei(amount.toString(), "mwei");
      const result = await contract.methods
        .transfer("0x879464FD10061497CCfB3c9E05a795EbAE1e8018", amountWei)
        .send({ from: account });

      return result.status;
    } catch {
      setError("Error en la transacción");
      return false;
    }
  };

  /* ========================
     ACTIVAR PLAN
  ======================== */
  const handleDeposit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (!isAuthenticated || !user) {
      setIsLoading(false);
      navigate('/login', { state: { from: '/deposit' } });
      return;
    }

    if (!selectedPlan.isFree && !walletConnected) {
      setError("Conecta tu Trust Wallet");
      setIsLoading(false);
      return;
    }

    if (!selectedPlan.isFree) {
      const success = await transferUSDT(selectedPlan.price / 10);
      if (!success) return setIsLoading(false);
    }

    const headers = { "Content-Type": "application/json" };

    const res = await fetch(`${API_BASE_URL}/activate-plan/`, {
      method: "POST",
      headers,
      credentials: 'include',
      body: JSON.stringify({
        plan: selectedPlan.name,
        email: user.email,
        amount: selectedPlan.price,
      }),
    });

    const parseJsonSafe = async (r) => {
      const t = await r.text();
      if (!t) return null;
      try {
        return JSON.parse(t);
      } catch (err) {
        console.error('Invalid JSON response:', t);
        return null;
      }
    };

    const data = await parseJsonSafe(res);

    if (res.ok) {
      const updatedUser = {
        ...user,
        ...data.user,
        has_financial_activation: true,
        plan_name: selectedPlan.name,
      };

      // Backend setea cookies HttpOnly; no guardamos tokens en localStorage
      setUser(updatedUser);
      setIsAuthenticated(true);

      setMessage(`¡Plan ${selectedPlan.name} activado correctamente!`);
      setTimeout(() => navigate("/dashboard"), 2000);
    } else {
      setError(data.error || "Error al activar el plan");
    }

    setIsLoading(false);
  };

  /* ========================
     ESTADOS
  ======================== */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600">Cargando información...</p>
      </div>
    );
  }

  if (showVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white p-10 rounded-xl shadow max-w-md w-full text-center">
          <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Verifica tu cuenta</h2>
          <p className="text-gray-600">{user.email}</p>
          <button
            onClick={() => navigate("/verify-wallet")}
            className="mt-6 rounded-lg bg-slate-900 px-6 py-2 text-white transition hover:bg-slate-800"
          >
            Ir a verificar wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src="/static/Logo Boostme.png" alt="BoostMe logo" className="h-10 w-auto rounded-2xl" />
            <div>
              <h1 className="text-xl font-bold text-[var(--brand-900)] sm:text-2xl">BoostMe</h1>
              <p className="text-sm text-slate-500">Tu panel diario</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.65rem] font-semibold tracking-[0.06em] text-slate-700 leading-none">
              {user?.plan_name ? `Plan ${user.plan_name}` : 'Plan Free'}
            </span>
            <button
              onClick={handleLogout}
              className="hidden rounded-lg bg-[var(--brand-900)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#111c33] md:inline-flex"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <nav className="mx-auto mt-4 hidden max-w-7xl md:flex md:justify-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${location.pathname === '/dashboard' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              <Wallet className="h-5 w-5" />
              <span>Inicio</span>
            </button>
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${location.pathname === '/dashboard/tasks' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => navigate('/dashboard/tasks')}
            >
              <Target className="h-5 w-5" />
              <span>Tareas</span>
            </button>
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${location.pathname === '/dashboard/referidos' || location.pathname === '/referidos' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => navigate('/dashboard/referidos')}
            >
              <Users className="h-5 w-5" />
              <span>Referidos</span>
            </button>
            <button 
              className={`flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)] ${location.pathname === '/dashboard/profile' || location.pathname === '/Profile' ? 'text-[var(--brand-900)]' : ''}`}
              onClick={() => navigate('/dashboard/profile')}
            >
              <Users className="h-5 w-5" />
              <span>Perfil</span>
            </button>
            <button
              className="flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)]"
              onClick={() => navigate('/deposit')}
            >
              <Crown className="h-4 w-4" />
              <span>Planes</span>
            </button>
            <button
              className="flex items-center gap-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-slate-200 hover:text-[var(--brand-900)]"
              onClick={() => navigate('/dashboard/bonuses')}
            >
              <Gift className="h-4 w-4" />
              <span>Bonos</span>
            </button>
          </div>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        <div className="bg-white max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">

          {/* HEADER */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--brand-900)] mb-1">
              {isLoggedIn ? "Planes BoostMe" : "¡Bienvenido a BoostMe!"}
            </h1>
            <p className="text-gray-500">
              {isLoggedIn
                ? "Elige el plan que mejor se adapte a tu crecimiento."
                : "Explora los planes y activa tu cuenta cuando quieras."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {user?.has_financial_activation && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-700">
                <div className="inline-flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-600" />
                  <span>Plan actual: {user.plan_name}</span>
                </div>
              </div>
            )}

            {isLoggedIn && !walletConnected && (
              <button
                onClick={connectWallet}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
              >
                Conectar Trust Wallet
              </button>
            )}

            {!isLoggedIn && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Mira los planes aquí. Inicia sesión para activar uno y empezar a usar tus beneficios.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PLANES */}
      {showPlans && !selectedPlan && (
        <div>
          <h2 className="text-center text-xl font-semibold mb-6">
            Selecciona tu Plan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.slug || plan.name}
                onClick={() => {
                  if (!isAuthenticated || !user) {
                    navigate('/login', { state: { from: '/deposit' } });
                    return;
                  }
                  setSelectedPlan({
                    ...plan,
                    name: plan.name,
                    price: Number(plan.price || 0),
                    isFree: Boolean(plan.is_free),
                    recommended: Boolean(plan.recommended),
                    features: Array.isArray(plan.features) ? plan.features : []
                  });
                }}
                className={`relative bg-white rounded-2xl p-6 shadow hover:-translate-y-1 hover:shadow-lg transition cursor-pointer
                  ${plan.recommended && "border-2 border-blue-600"}
                  ${plan.is_free && "border-2 border-emerald-500"}
                `}
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {plan.recommended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <Star className="w-3.5 h-3.5" /> Recomendado
                    </span>
                  )}

                  {plan.is_free && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <Wallet className="w-3.5 h-3.5" /> Gratis
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  {plan.is_free ? "GRATIS" : `${Number(plan.price || 0)} USDT`}
                </p>

                <ul className="space-y-2 mb-6">
                  {(Array.isArray(plan.features) ? plan.features : []).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500" />
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
      {selectedPlan && (
        <form
          onSubmit={handleDeposit}
          className="bg-white p-6 rounded-2xl shadow max-w-md mx-auto w-full"
        >
          <div className="flex justify-between bg-gray-100 p-4 rounded-lg mb-4">
            <strong>{selectedPlan.name}</strong>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="text-blue-600 font-semibold"
            >
              Cambiar
            </button>
          </div>

          {message && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Listo</p>
                <p className="text-emerald-700/90">{message}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Atención</p>
                <p className="text-rose-700/90">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            {isLoading ? "Activando..." : "Activar Plan"}
          </button>
        </form>
      )}
    </div>
  );
};

export default Plans;

