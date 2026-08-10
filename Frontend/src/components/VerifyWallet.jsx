import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Web3 from "web3";
import { API_BASE_URL } from "../Base";

const VerifyWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("polygon");
  const [nonce, setNonce] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOpenInApp, setShowOpenInApp] = useState(false);

  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);

  const getEvmWalletProvider = () => {
    const providers = [
      window.ethereum,
      window.trustwallet,
      window.okxwallet,
      window.bitkeep,
      window.coinbaseWalletExtension,
      window.imToken,
      window.walletconnect,
      window.metaMask,
    ];

    return providers.find(Boolean) || null;
  };

  useEffect(() => {
    const stateData = location.state || {};
    const stored = sessionStorage.getItem("walletVerificationData");
    const savedData = stored ? JSON.parse(stored) : null;

    if (stateData.wallet_address && stateData.wallet_verification_nonce) {
      setWalletAddress(stateData.wallet_address);
      setWalletNetwork(stateData.wallet_network || 'polygon');
      setNonce(stateData.wallet_verification_nonce);
      sessionStorage.setItem("walletVerificationData", JSON.stringify(stateData));
      return;
    }

    if (savedData?.wallet_address && savedData?.wallet_verification_nonce) {
      setWalletAddress(savedData.wallet_address);
      setWalletNetwork(savedData.wallet_network || 'polygon');
      setNonce(savedData.wallet_verification_nonce);
      return;
    }

    setError("No hay datos de verificación disponibles. Regístrate primero para obtener el nonce.");
  }, [location.state]);

  useEffect(() => {
    if (!walletAddress || !nonce) {
      setShowOpenInApp(false);
      return;
    }

    setShowOpenInApp(false);
  }, [walletAddress, nonce]);

  const handleOpenInWalletApp = () => {
    const currentUrl = window.location.href;
    const fallbackMessage = walletNetwork === 'tron'
      ? "Instala Trust Wallet o TronLink, o usa WalletConnect desde la app de tu wallet."
      : "Instala MetaMask, Trust Wallet, OKX o Coinbase Wallet, o usa WalletConnect desde la app.";

    try {
      if (walletNetwork === 'tron') {
        const trustWalletUrl = `https://link.trustwallet.com/open_url?coin_id=195&url=${encodeURIComponent(currentUrl)}`;
        const trc20Url = `trust://wc?url=${encodeURIComponent(currentUrl)}`;
        const tronLinkUrl = `https://link.tronlink.org/open?target=${encodeURIComponent(currentUrl)}`;
        const tronDirectUrl = `tronlink://open?target=${encodeURIComponent(currentUrl)}`;

        const primaryUrl = /Android/i.test(window.navigator.userAgent) ? trc20Url : trustWalletUrl;
        window.location.href = primaryUrl;

        window.setTimeout(() => {
          window.location.href = tronLinkUrl;
          window.setTimeout(() => {
            window.location.href = tronDirectUrl;
            window.setTimeout(() => {
              setError(`No se pudo abrir la app. ${fallbackMessage}`);
            }, 1200);
          }, 1000);
        }, 1200);
        return;
      }

      const metamaskUrl = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
      const trustWalletUrl = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;

      const primaryUrl = /Android/i.test(window.navigator.userAgent) ? metamaskUrl : trustWalletUrl;
      window.location.href = primaryUrl;
      window.setTimeout(() => {
        setError(`No se pudo abrir la app. ${fallbackMessage}`);
      }, 1800);
    } catch {
      setError(`No se pudo abrir la app. ${fallbackMessage}`);
    }
  };

  const handleSignWallet = async () => {
    setError("");
    setSuccess("");

    if (!walletAddress || !nonce) {
      setError("Falta la dirección de wallet o el nonce de verificación.");
      return;
    }

    if (isMobileDevice()) {
      setShowOpenInApp(true);
    } else {
      setShowOpenInApp(false);
    }

    const message = `BoostMe verification nonce: ${nonce}`;

    try {
      setLoading(true);
      let signature;

      if (walletNetwork === 'tron') {
        const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
        if (!tronWeb || !tronWeb.ready) {
          setShowOpenInApp(true);
          throw new Error("Tu wallet TRON no está disponible en este navegador. Abre esta página desde la app de tu wallet y usa \"Abrir en la app\".");
        }
        const currentAddress = tronWeb.defaultAddress?.base58 || (await tronWeb.trx.getAccount()).address;
        if (!currentAddress || currentAddress !== walletAddress) {
          throw new Error("La wallet TRON conectada no coincide con la dirección registrada.");
        }
        try {
          signature = await tronWeb.trx.sign(message);
        } catch {
          signature = await tronWeb.trx.sign(message, currentAddress);
        }
      } else {
        const provider = getEvmWalletProvider() || (window.web3 && window.web3.currentProvider);
        if (!provider) {
          setShowOpenInApp(true);
          throw new Error("Tu wallet no está disponible en este navegador. Abre esta página desde la app de tu wallet y usa \"Abrir en la app\".");
        }

        const web3 = new Web3(provider);
        const accounts = await web3.eth.requestAccounts();
        if (!accounts || !accounts.length) {
          throw new Error("Conecta primero la cuenta correcta en tu wallet para continuar.");
        }
        const account = accounts[0];
        if (account.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error(`La wallet conectada no coincide con la dirección registrada (${walletAddress}). Conecta la misma cuenta que usaste al registrarte.`);
        }

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
      }

      const response = await fetch(`${API_BASE_URL}/verify-wallet/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress, wallet_network: walletNetwork, nonce, signature }),
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

        {showOpenInApp && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 px-4 py-3 rounded mb-4">
            <p className="font-medium mb-2">Tu wallet TRON no está disponible desde este navegador.</p>
            <p className="mb-3">Pulsa “Abrir en la app” para abrir tu Trust Wallet o TronLink instalada en el móvil y confirmar la dirección que registraste. Si no tienes ninguna de las dos apps, descárgala primero o usa WalletConnect desde la app.</p>
            <button
              type="button"
              onClick={handleOpenInWalletApp}
              className="w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition"
            >
              Abrir en la app para verificar la dirección
            </button>
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
