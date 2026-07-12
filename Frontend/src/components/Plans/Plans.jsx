import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../Base";
import { Wallet, Star, Check, ArrowRight, Mail, Loader2 } from "lucide-react";
import Web3 from "web3";

const Plans = () => {
  const { user, loading, accessToken, setUser, setAccessToken, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  const plans = [
    {
      name: "Free",
      price: 0,
      isFree: true,
      recommended: true,
      features: [
        "10 tareas diarias",
        "Videos y redes sociales",
        "Encuestas básicas",
        "5 BOOST/semana",
        "7 referidos mínimos para retirar",
        "5% comisión por referido",
      ],
    },
    {
      name: "Starter",
      price: 50,
      features: [
        "15 tareas diarias",
        "Videos, redes sociales y encuestas",
        "Instalación de apps",
        "10 BOOST/semana",
        "5 referidos mínimos para retirar",
        "10% comisión por referido",
        "Retiros semanales",
      ],
    },
    {
      name: "Pro",
      price: 150,
      features: [
        "20 tareas diarias",
        "Todas las categorías básicas",
        "Registros en servicios",
        "Ofertas premium",
        "20 BOOST/semana",
        "3 referidos mínimos para retirar",
        "15% comisión por referido",
        "Retiros cada 3 días",
      ],
    },
    {
      name: "Elite",
      price: 300,
      features: [
        "Tareas ilimitadas",
        "Todas las categorías disponibles",
        "Ofertas exclusivas",
        "Compras con cashback",
        "40 BOOST/semana",
        "Sin mínimo de referidos",
        "20% comisión por referido",
        "Retiros diarios",
      ],
    },
  ];

  useEffect(() => {
    if (loading) return;
    if (!user) return setError("No se encontró la información del usuario.");
    if (!user.is_email_verified) return setShowVerification(true);
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
          <h2 className="text-xl font-bold mb-2">Verifica tu correo</h2>
          <p className="text-gray-600">{user.email}</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* HEADER */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-1">
          ¡Bienvenido a BoostMe!
        </h1>
        <p className="text-gray-500">
          {user.has_financial_activation
            ? "Actualiza tu plan"
            : "Activa tu cuenta y empieza a ganar BOOST"}
        </p>

        {user.has_financial_activation && (
          <p className="text-emerald-500 font-semibold mt-2">
            Plan actual: {user.plan_name}
          </p>
        )}

        {!walletConnected && (
          <button
            onClick={connectWallet}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Conectar Trust Wallet
          </button>
        )}

        {walletConnected && (
          <p className="mt-3 text-emerald-500 font-semibold">
            Wallet conectada: {account.slice(0, 6)}...{account.slice(-4)}
          </p>
        )}
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
                key={plan.name}
                onClick={() => setSelectedPlan(plan)}
                className={`relative bg-white rounded-2xl p-6 shadow hover:-translate-y-1 hover:shadow-lg transition cursor-pointer
                  ${plan.recommended && "border-2 border-blue-600"}
                  ${plan.isFree && "border-2 border-emerald-500"}
                `}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 right-5 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex gap-1 items-center">
                    <Star className="w-4 h-4" /> Recomendado
                  </span>
                )}

                {plan.isFree && (
                  <span className="absolute -top-3 right-5 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm flex gap-1 items-center">
                    <Wallet className="w-4 h-4" /> Gratis
                  </span>
                )}

                <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  {plan.isFree ? "GRATIS" : `${plan.price / 10} USDT`}
                </p>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
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
            <div className="bg-emerald-100 text-emerald-700 p-3 rounded mb-3 text-center">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-3 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            {isLoading ? "Activando..." : "Activar Plan"}
          </button>
        </form>
      )}
    </div>
  );
};

export default Plans;

