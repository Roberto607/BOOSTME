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
    // Also support query params so the DApp browser keeps verification data
    const params = new URLSearchParams(window.location.search);
    const q_wallet_address = params.get('wallet_address');
    const q_wallet_verification_nonce = params.get('wallet_verification_nonce');
    const q_wallet_network = params.get('wallet_network');
    const storedSession = sessionStorage.getItem("walletVerificationData");
    const storedLocal = localStorage.getItem("walletVerificationData");
    const savedData = storedSession ? JSON.parse(storedSession) : (storedLocal ? JSON.parse(storedLocal) : null);

    if (stateData.wallet_address && stateData.wallet_verification_nonce) {
      setWalletAddress(stateData.wallet_address);
      setWalletNetwork(stateData.wallet_network || 'polygon');
      setNonce(stateData.wallet_verification_nonce);
      sessionStorage.setItem("walletVerificationData", JSON.stringify(stateData));
      localStorage.setItem("walletVerificationData", JSON.stringify(stateData));
      if (isMobileDevice()) setShowOpenInApp(true);
      return;
    }

    // If URL contains verification data, prefer it and persist
    if (q_wallet_address && q_wallet_verification_nonce) {
      const urlData = { wallet_address: q_wallet_address, wallet_verification_nonce: q_wallet_verification_nonce, wallet_network: q_wallet_network || 'polygon' };
      setWalletAddress(urlData.wallet_address);
      setWalletNetwork(urlData.wallet_network || 'polygon');
      setNonce(urlData.wallet_verification_nonce);
      sessionStorage.setItem("walletVerificationData", JSON.stringify(urlData));
      localStorage.setItem("walletVerificationData", JSON.stringify(urlData));
      if (isMobileDevice()) setShowOpenInApp(true);
      return;
    }

    if (savedData?.wallet_address && savedData?.wallet_verification_nonce) {
      setWalletAddress(savedData.wallet_address);
      setWalletNetwork(savedData.wallet_network || 'polygon');
      setNonce(savedData.wallet_verification_nonce);
      if (isMobileDevice()) setShowOpenInApp(true);
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

    // If TRON on mobile, poll for tronWeb readiness so we don't show an error loop
    if (walletNetwork === 'tron' && isMobileDevice()) {
      setCheckingTron(true);
      setTronReady(false);
      setInstruction('Esperando a que la wallet cargue dentro de la app...');
      const start = Date.now();
      const intervalId = setInterval(() => {
        const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
        if (tronWeb && (tronWeb.ready || tronWeb.defaultAddress)) {
          console.log('[BoostMe] tronWeb detected');
          setTronReady(true);
          setInstruction('Wallet detectada. Procediendo a firmar...');
          setCheckingTron(false);
          clearInterval(intervalId);
          // auto-trigger signing once when opened inside DApp browser
          if (!attemptedAutoSign && walletAddress && nonce) {
            setAttemptedAutoSign(true);
            setTimeout(() => {
              try {
                handleSignWallet();
              } catch (e) {
                console.error('[BoostMe] auto sign failed', e);
              }
            }, 600);
          }
          return;
        }
        if (Date.now() - start > 15000) {
          // timeout after 15s
          setCheckingTron(false);
          setInstruction('No se detectó la wallet dentro de la app. Abre Trust Wallet/TronLink → Browser y carga esta URL.');
          clearInterval(intervalId);
          return;
        }
      }, 700);
    }
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

        let opened = false;
        const start = Date.now();
        setSuccess('Intentando abrir la wallet instalada...');
        setError('');
        setShowOpenInApp(false);

        const onVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            opened = true;
            console.log('[BoostMe] Página escondida: la app probablemente se abrió');
            setSuccess('App abierta, continúa en tu wallet para firmar.');
            document.removeEventListener('visibilitychange', onVisibilityChange);
          }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);

        // Try to open each deep link sequentially, using location.href first then anchor click
        const tryLinks = async () => {
          for (let i = 0; i < deepLinks.length; i++) {
            const url = deepLinks[i];
            console.log('[BoostMe] Intentando deep link:', url);
            try {
              // try direct navigation first
              window.location.href = url;
            } catch (e) {
              const a = document.createElement('a');
              a.href = url;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }

            // wait briefly to let handler run
            await new Promise((r) => setTimeout(r, 1000));
            if (opened) return;
          }

          // After attempts, wait a short time for visibility change
          await new Promise((r) => setTimeout(r, 1200));
          if (!opened) {
            console.error('[BoostMe] Falló la apertura de Trust Wallet / TronLink con todos los deep links.');
            setError('No se pudo abrir la wallet automáticamente. Usa "Copiar URL" o escanea el QR en Trust Wallet → Browser.');
            setSuccess('');
            setShowOpenInApp(true);
            document.removeEventListener('visibilitychange', onVisibilityChange);
          }
        };

        tryLinks();
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

  // Intent URL builder for Chrome on Android
  const getCurrentUrlWithParams = () => {
    const url = new URL(window.location.href);
    // ensure wallet params are present in URL so the DApp browser loads them
    const stored = sessionStorage.getItem('walletVerificationData') || localStorage.getItem('walletVerificationData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.wallet_address) url.searchParams.set('wallet_address', parsed.wallet_address);
        if (parsed.wallet_verification_nonce) url.searchParams.set('wallet_verification_nonce', parsed.wallet_verification_nonce);
        if (parsed.wallet_network) url.searchParams.set('wallet_network', parsed.wallet_network);
      } catch (e) {
        // ignore
      }
    }
    return url.toString();
  };

  const buildIntentUrl = (packageName) => {
    const currentUrl = getCurrentUrlWithParams();
    const encoded = encodeURIComponent(currentUrl);
    // browser_fallback_url: open the same URL if app not available
    const fallback = encodeURIComponent(currentUrl);
    return `intent://browser?url=${encoded}#Intent;package=${packageName};scheme=trust;S.browser_fallback_url=${fallback};end`;
  };

  const handleOpenIntent = (packageName) => {
    try {
      const intentUrl = buildIntentUrl(packageName);
      console.log('[BoostMe] Intent URL:', intentUrl);
      // First try assigning location (works in many Chrome versions)
      try {
        window.location.href = intentUrl;
      } catch (e) {
        // fallback to anchor click
        const a = document.createElement('a');
        a.href = intentUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setSuccess('Intent enviado. Si la app está instalada, debería abrirla.');
      setError('');
    } catch (e) {
      console.error('[BoostMe] Error opening intent:', e);
      setError('No se pudo intentar abrir la app con Intent.');
    }
  };


  const [showQr, setShowQr] = useState(false);
  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSuccess('URL copiada al portapapeles. Ábrela desde Trust Wallet → Browser → Pegar.');
      setError('');
    } catch (e) {
      console.error('[BoostMe] copy failed', e);
      setError('No se pudo copiar la URL automáticamente. Copia manualmente: ' + window.location.href);
    }
  };
  const [lastSignature, setLastSignature] = useState(null);
  const [lastResponseText, setLastResponseText] = useState(null);
  const [tronReady, setTronReady] = useState(false);
  const [checkingTron, setCheckingTron] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [attemptedAutoSign, setAttemptedAutoSign] = useState(false);

  const handleSignWallet = async () => {
    setError("");
    setSuccess("");

    console.log("[BoostMe] Iniciando firma de wallet:", {
      walletNetwork,
      walletAddress,
      nonce,
      isMobile: isMobileDevice(),
    });

    // Helper: wait for a provider to appear for a limited time
    const waitForProvider = async (timeout = 10000, interval = 700) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (walletNetwork === 'tron') {
          const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
          if (tronWeb && (tronWeb.ready || tronWeb.defaultAddress)) return tronWeb;
        } else {
          const provider = getEvmWalletProvider() || (window.web3 && window.web3.currentProvider);
          if (provider) return provider;
        }
        await new Promise((r) => setTimeout(r, interval));
      }
      return null;
    };

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

    // If user is in a wallet DApp browser, wait a bit for provider to appear
    let provider = null;
    try {
      provider = await waitForProvider(12000, 600);
    } catch (e) {
      provider = null;
    }

    if (!provider) {
      // No provider available: show fallback and instruct user
      setShowOpenInApp(true);
      setInstruction('No se detectó la wallet en este navegador. Abre esta página dentro de la app/wallet o usa "Copiar URL".');
      setLoading(false);
      return;
    }

    const message = `BoostMe verification nonce: ${nonce}`;

    try {
      setLoading(true);
      let signature;

      if (walletNetwork === 'tron') {
        // Prefer any available tron provider even if tronWeb.ready is falsy
        const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
        console.log("[BoostMe] Tron provider disponible:", !!tronWeb, tronWeb?.ready);
        if (!tronWeb) {
          // No provider at all -> fallback
          setShowOpenInApp(true);
          setInstruction('Tu wallet TRON no está disponible en este navegador. Abre esta página dentro de Trust Wallet/TronLink (DApp browser) y vuelve a intentar.');
          setLoading(false);
          return;
        }

        // Try to obtain the current address (tronWeb may initialize asynchronously)
        let currentAddress = null;
        try {
          currentAddress = tronWeb.defaultAddress?.base58 || (await tronWeb.trx.getAccount()).address;
        } catch (e) {
          console.warn('[BoostMe] getAccount failed, currentAddress unknown yet', e);
        }

        console.log("[BoostMe] Tron currentAddress:", currentAddress, "walletAddress:", walletAddress);
        // If the provider exists but the address is not yet available, still attempt signing; the wallet app will prompt for account/permission
        try {
          // Convert message to hex because some tron providers expect hex input
          let messageHex;
          try {
            if (tronWeb && typeof tronWeb.toHex === 'function') {
              messageHex = tronWeb.toHex(message);
            } else {
              // simple fallback: convert string to hex
              let h = '';
              for (let i = 0; i < message.length; i++) h += message.charCodeAt(i).toString(16).padStart(2, '0');
              messageHex = h;
            }
          } catch (convErr) {
            console.warn('[BoostMe] toHex conversion failed, using raw message', convErr);
            messageHex = message;
          }

          // Try signing the hex message
          try {
            signature = await tronWeb.trx.sign(messageHex);
          } catch (signErr) {
            console.warn('[BoostMe] Tron trx.sign without params failed, retrying with address:', signErr);
            signature = await tronWeb.trx.sign(messageHex, currentAddress);
          }
        } catch (errSign) {
          console.error('[BoostMe] Signing failed on tronWeb:', errSign);
          setLastResponseText(errSign?.stack || JSON.stringify(errSign));
          // If signing failed because provider not ready, surface fallback
          setShowOpenInApp(true);
          setInstruction('No se pudo firmar automáticamente. Asegúrate de que la página está cargada dentro del navegador DApp de tu wallet y vuelve a intentar.');
          setLoading(false);
          return;
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
      setLastSignature(signature);

      const response = await fetch(`${API_BASE_URL}/verify-wallet/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress, wallet_network: walletNetwork, nonce, signature }),
        credentials: "include",
      });

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // fallback to text if not json
        const text = await response.text();
        setLastResponseText(text);
        console.warn('[BoostMe] Backend response not JSON:', text);
      }

      console.log("[BoostMe] Respuesta del backend:", response.status, data || lastResponseText);
      if (!response.ok) {
        const errMsg = (data && (data.error || data.detail)) || lastResponseText || 'Error al verificar la wallet.';
        setError(errMsg);
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
      setLastResponseText(err?.stack || JSON.stringify(err));
      setError(err?.message || 'Error al firmar el nonce.');
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
            <div className="grid grid-cols-1 gap-2 mt-3">
              <button
                type="button"
                onClick={handleOpenInWalletApp}
                className="w-full py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition"
              >
                Abrir en la app
              </button>

              <button
                type="button"
                onClick={handleOpenInWalletApp}
                className="w-full py-2 bg-amber-400 text-white font-semibold rounded-lg hover:bg-amber-500 transition"
              >
                Abrir Wallet instalada
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={copyUrlToClipboard}
                  className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Copiar URL
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="py-2 px-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  {showQr ? 'Ocultar QR' : 'Mostrar QR'}
                </button>
              </div>

              {showQr && (
                <div className="mt-3 flex justify-center">
                  <img
                    alt="QR URL"
                    src={`https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=${encodeURIComponent(window.location.href)}`}
                    className="rounded-md border"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-600 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {(lastSignature || lastResponseText) && (
          <div className="bg-gray-50 border-l-4 border-gray-300 text-gray-800 px-4 py-3 rounded mb-4">
            <p className="font-medium">Debug: firma / respuesta cruda</p>
            {lastSignature && (
              <div className="mt-2 text-sm break-words">
                <strong>Firma:</strong>
                <div className="mt-1 p-2 bg-white border rounded text-xs text-gray-700">{String(lastSignature)}</div>
              </div>
            )}
            {lastResponseText && (
              <div className="mt-2 text-sm break-words">
                <strong>Respuesta cruda:</strong>
                <div className="mt-1 p-2 bg-white border rounded text-xs text-gray-700 whitespace-pre-wrap">{String(lastResponseText)}</div>
              </div>
            )}
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
