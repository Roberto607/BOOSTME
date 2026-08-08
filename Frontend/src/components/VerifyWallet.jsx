import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Web3 from "web3";
import { API_BASE_URL } from "../Base";

const VerifyWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [walletAddress, setWalletAddress] = useState("");
  const [nonce, setNonce] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stateData = location.state || {};
    const stored = sessionStorage.getItem("walletVerificationData");
    const savedData = stored ? JSON.parse(stored) : null;

    if (stateData.wallet_address && stateData.wallet_verification_nonce) {
      setWalletAddress(stateData.wallet_address);
      setNonce(stateData.wallet_verification_nonce);
      sessionStorage.setItem("walletVerificationData", JSON.stringify(stateData));
      return;
    }

    if (savedData?.wallet_address && savedData?.wallet_verification_nonce) {
      setWalletAddress(savedData.wallet_address);
      setNonce(savedData.wallet_verification_nonce);
      return;
    }

    setError("No hay datos de verificación disponibles. Regístrate primero para obtener el nonce.");
  }, [location.state]);

  const handleSignWallet = async () => {
    setError("");
    setSuccess("");

    if (!walletAddress || !nonce) {
      setError("Falta la dirección de wallet o el nonce de verificación.");
      return;
    }

    if (!window.ethereum && !window.trustwallet && !window.web3) {
      setError("Necesitas una wallet compatible instalada, como MetaMask o Trust Wallet.");
      return;
    }

    try {
      setLoading(true);
      const provider = window.ethereum || window.trustwallet || window.web3.currentProvider;
      const web3 = new Web3(provider);
      const accounts = await web3.eth.requestAccounts();
      if (!accounts || !accounts.length) {
        throw new Error("No se pudo obtener la cuenta de la wallet.");
      }
      const account = accounts[0];
      if (account.toLowerCase() !== walletAddress.toLowerCase()) {
        setError("La wallet conectada no coincide con la dirección registrada.");
        setLoading(false);
        return;
      }

      const message = `BoostMe verification nonce: ${nonce}`;
      let signature;
      if (web3.eth.personal && typeof web3.eth.personal.sign === "function") {
        signature = await web3.eth.personal.sign(message, account, "");
      } else if (provider.request) {
        signature = await provider.request({
          method: "personal_sign",
          params: [message, account],
        });
      } else {
        throw new Error("La wallet no soporta la firma personal.");
      }

      const response = await fetch(`${API_BASE_URL}verify-wallet/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress, nonce, signature }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || data?.detail || "Error al verificar la wallet.");
        setLoading(false);
        return;
      }

      setSuccess(data?.message || "Wallet verificada correctamente.");
      sessionStorage.removeItem("walletVerificationData");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al firmar el nonce.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-gray-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 w-full max-w-lg animate-fadeIn">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Verificar Wallet</h2>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-600 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-600 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dirección de Wallet</label>
            <input
              type="text"
              value={walletAddress}
              readOnly
              className="w-full p-3 mt-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nonce de verificación</label>
            <textarea
              rows={2}
              value={nonce}
              readOnly
              className="w-full p-3 mt-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700"
            />
          </div>

          <button
            type="button"
            onClick={handleSignWallet}
            disabled={loading || !walletAddress || !nonce}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Firmando y verificando..." : "Firmar nonce y verificar wallet"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Volver al registro
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyWallet;
