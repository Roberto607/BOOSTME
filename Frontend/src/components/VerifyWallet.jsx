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

  // In-page mobile console for debugging (Eruda). Loads only on mobile.
  useEffect(() => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
      if (!isMobile) return;
      if (window.eruda) return;
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/eruda';
      s.async = true;
      s.onload = () => {
        try { window.eruda && window.eruda.init(); } catch (e) { console.error('[BoostMe] eruda init failed', e); }
      };
      document.body.appendChild(s);
    } catch (e) {
      console.error('[BoostMe] failed to inject eruda', e);
    }
  }, []);

  const loadErudaAndOpen = () => {
    try {
      if (window.eruda) { window.eruda.show(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/eruda';
      s.async = true;
      s.onload = () => {
        try {
          window.eruda && window.eruda.init();
          window.eruda && window.eruda.show();
        } catch (e) { console.error('[BoostMe] eruda open failed', e); }
      };
      document.body.appendChild(s);
    } catch (e) {
      console.error('[BoostMe] failed to load eruda', e);
      setError('No se pudo abrir la consola en esta página.');
    }
  };

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
    const storedSession = sessionStorage.getItem("walletVerificationData");
    const storedLocal = localStorage.getItem("walletVerificationData");
    const savedData = storedSession ? JSON.parse(storedSession) : (storedLocal ? JSON.parse(storedLocal) : null);

    if (stateData.wallet_address && stateData.wallet_verification_nonce) {
      setWalletAddress(stateData.wallet_address);
      setWalletNetwork(stateData.wallet_network || 'polygon');
      setNonce(stateData.wallet_verification_nonce);
      sessionStorage.setItem("walletVerificationData", JSON.stringify(stateData));
      localStorage.setItem("walletVerificationData", JSON.stringify(stateData));
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
    const verificationData = { wallet_address: walletAddress, wallet_verification_nonce: nonce, wallet_network: walletNetwork };
    sessionStorage.setItem("walletVerificationData", JSON.stringify(verificationData));
    localStorage.setItem("walletVerificationData", JSON.stringify(verificationData));

    console.log("[BoostMe] Intentando abrir wallet:", {
      walletNetwork,
      walletAddress,
      nonce,
      currentUrl,
      userAgent: window.navigator.userAgent,
    });

    try {
      if (walletNetwork === 'tron') {
        const deepLinks = [
          `trust://browser?url=${encodeURIComponent(currentUrl)}`,
          `tronlink://open?target=${encodeURIComponent(currentUrl)}`,
          `tronlink://navigate?url=${encodeURIComponent(currentUrl)}`,
        ];

        let index = 0;
        const tryNextDeepLink = () => {
          if (index >= deepLinks.length) {
            console.error("[BoostMe] Falló la apertura de Trust Wallet / TronLink con todos los deep links.");
            setError("No se pudo abrir Trust Wallet o TronLink.");
            setSuccess("");
            return;
          }

          const url = deepLinks[index];
          index += 1;

          console.log("[BoostMe] Intentando deep link:", url);

          const link = document.createElement("a");
          link.href = url;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          window.setTimeout(() => {
            tryNextDeepLink();
          }, 1200);
        };

        setSuccess("Abre Trust Wallet o TronLink y firma.");
        setError("");
        setShowOpenInApp(false);
        tryNextDeepLink();
        return;
      }

      const metamaskUrl = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
      const trustWalletUrl = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
      const primaryUrl = /Android/i.test(window.navigator.userAgent) ? metamaskUrl : trustWalletUrl;

      console.log("[BoostMe] Deep link EVM:", { primaryUrl, currentUrl });
      window.location.href = primaryUrl;
      setSuccess("Abre tu wallet y firma.");
      setError("");
      setShowOpenInApp(false);
      window.setTimeout(() => {
        setError("No se pudo abrir la wallet.");
        setSuccess("");
      }, 1800);
    } catch (err) {
      console.error("[BoostMe] Error al abrir wallet:", err);
      const fallbackText = walletNetwork === 'tron'
        ? "Instala Trust Wallet o TronLink."
        : "Instala una wallet compatible.";
      setError(`No se pudo abrir la app. ${fallbackText}`);
      setSuccess("");
    }
  };

  const handleSignWallet = async () => {
    setError("");
    setSuccess("");

    console.log("[BoostMe] Iniciando firma de wallet:", {
      walletNetwork,
      walletAddress,
      nonce,
      isMobile: isMobileDevice(),
    });

    if (!walletAddress || !nonce) {
      console.error("[BoostMe] Faltan walletAddress o nonce.");
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
        console.log("[BoostMe] Tron provider disponible:", !!tronWeb, tronWeb?.ready);
        if (!tronWeb || !tronWeb.ready) {
          setShowOpenInApp(true);
          throw new Error("Tu wallet TRON no está disponible en este navegador. Abre esta página desde la app de tu wallet y usa \"Abrir en la app\".");
        }
        const currentAddress = tronWeb.defaultAddress?.base58 || (await tronWeb.trx.getAccount()).address;
        console.log("[BoostMe] Tron currentAddress:", currentAddress, "walletAddress:", walletAddress);
        if (!currentAddress || currentAddress !== walletAddress) {
          throw new Error("La wallet TRON conectada no coincide con la dirección registrada.");
        }
        try {
          signature = await tronWeb.trx.sign(message);
        } catch (signErr) {
          console.warn("[BoostMe] Tron trx.sign sin parámetros falló, reintentando:", signErr);
          signature = await tronWeb.trx.sign(message, currentAddress);
        }
      } else {
        const provider = getEvmWalletProvider() || (window.web3 && window.web3.currentProvider);
        console.log("[BoostMe] EVM provider disponible:", !!provider);
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
        console.log("[BoostMe] EVM account:", account, "walletAddress:", walletAddress);
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

      console.log("[BoostMe] Firma generada correctamente:", signature);

      const response = await fetch(`${API_BASE_URL}/verify-wallet/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress, wallet_network: walletNetwork, nonce, signature }),
        credentials: "include",
      });

      const data = await response.json();
      console.log("[BoostMe] Respuesta del backend:", response.status, data);
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
      console.error("[BoostMe] Error final en la verificación:", err);
      setError(err.message || "Error al firmar el nonce.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-gray-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 w-full max-w-lg animate-fadeIn">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Verificar Wallet</h2>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-semibold text-gray-800">Verificar Wallet</h2>
          <button
            type="button"
            onClick={loadErudaAndOpen}
            className="ml-4 py-1 px-3 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Abrir consola
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-600 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {showOpenInApp && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 px-4 py-3 rounded mb-4">
            <p className="font-medium">Abre Trust Wallet o TronLink y firma.</p>
            <button
              type="button"
              onClick={handleOpenInWalletApp}
              className="w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition mt-3"
            >
              Abrir en la app
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
