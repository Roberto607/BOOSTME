import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Copy } from 'lucide-react';
import { REFERRALS_API_BASE_URL } from "../../Base";
import { useAuth } from '../../contexts/AuthContext';

const Referidos = () => {
  const [referralData, setReferralData] = useState({
    referralCode: '',
    referralCount: 0,
    totalReferralEarnings: 0,
    pendingEarnings: 0,
    canWithdraw: false,
    referralLink: '',
    commissionRate: 0,
    plan: 'free',
  });

  const [earnings, setEarnings] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const { accessToken } = useAuth();

  /* =======================
     HELPERS
  ======================== */

  const getMinReferrals = () => {
    const required = { free: 7, starter: 5, pro: 3, elite: 0 }[referralData.plan] ?? 0;
    return Math.max(required - referralData.referralCount, 0);
  };

  /* =======================
     API
  ======================== */

  const buildAuthHeaders = () => {
    const headers = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  };

  const loadReferralData = async () => {
    try {
      const res = await fetch(`${REFERRALS_API_BASE_URL}/system/stats/`, {
        credentials: 'include',
        headers: buildAuthHeaders(),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No se pudo cargar la información de referidos');
      }

      const data = await res.json();

      setReferralData({
        referralCode: data.referral_code || '',
        referralCount: data.total_referrals ?? 0,
        totalReferralEarnings: data.total_earnings ?? 0,
        pendingEarnings: data.pending_earnings ?? 0,
        canWithdraw: Boolean(data.can_withdraw),
        referralLink: data.referral_code
          ? `${window.location.origin}/register?ref=${data.referral_code}`
          : '',
        commissionRate: data.commission_rate ?? 0,
        plan: data.plan_name || 'free',
      });
    } catch (err) {
      setError(err.message || 'Error cargando los referidos');
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async () => {
    try {
      const res = await fetch(`${REFERRALS_API_BASE_URL}/earnings/`, {
        credentials: 'include',
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('No se pudo cargar el historial de ganancias');
      }
      const data = await res.json();
      setEarnings(data.results || data);
    } catch (err) {
      setError(err.message || 'Error cargando ganancias');
    }
  };

  const loadWithdrawals = async () => {
    try {
      const res = await fetch(`${REFERRALS_API_BASE_URL}/withdrawals/`, {
        credentials: 'include',
        headers: buildAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('No se pudo cargar el historial de retiros');
      }
      const data = await res.json();
      setWithdrawals(data.results || data);
    } catch (err) {
      setError(err.message || 'Error cargando retiros');
    }
  };

  useEffect(() => { loadReferralData(); }, []);
  useEffect(() => {
    if (activeTab === 'earnings') loadEarnings();
    if (activeTab === 'withdrawals') loadWithdrawals();
  }, [activeTab]);

  const handleCopyReferralLink = async () => {
    if (!referralData.referralLink) return;

    try {
      await navigator.clipboard.writeText(referralData.referralLink);
      setCopyMessage('Enlace copiado');
    } catch (err) {
      const fallbackInput = document.createElement('textarea');
      fallbackInput.value = referralData.referralLink;
      fallbackInput.style.position = 'fixed';
      fallbackInput.style.opacity = '0';
      document.body.appendChild(fallbackInput);
      fallbackInput.select();
      document.execCommand('copy');
      if (fallbackInput.parentNode) {
        fallbackInput.parentNode.removeChild(fallbackInput);
      }
      setCopyMessage('Enlace copiado');
    }

    setTimeout(() => setCopyMessage(''), 2000);
  };

  /* =======================
     STATES
  ======================== */

  if (loading) return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-6 lg:px-10 py-4">

      {/* HEADER */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Sistema de Referidos
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Gana dinero invitando amigos a BoostMe
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Referidos" value={referralData.referralCount} />
        <StatCard icon={DollarSign} label="Ganancias" value={`${referralData.totalReferralEarnings} USDT`} />
        <StatCard icon={TrendingUp} label="Pendiente" value={`${referralData.pendingEarnings} USDT`} />
      </div>

      {/* LINK */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Tu enlace de referido
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={referralData.referralLink}
            className="w-full p-2 sm:p-3 border rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={handleCopyReferralLink}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1"
          >
            <Copy size={16} /> Copiar
          </button>
        </div>
        {copyMessage && (
          <p className="text-xs text-emerald-600 mt-2">{copyMessage}</p>
        )}
      </div>

      {/* NEXT WITHDRAW */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h4 className="text-xs uppercase text-gray-500">Próximo retiro</h4>
        <p className="text-lg sm:text-xl font-bold text-gray-800">
          {referralData.canWithdraw
            ? 'Disponible ahora'
            : `Necesitas ${getMinReferrals()} referidos más`}
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['overview', 'earnings', 'withdrawals'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`min-w-[110px] px-4 py-2 rounded-lg text-sm font-semibold
              ${activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border'}`}
          >
            {tab === 'overview' ? 'Resumen' : tab === 'earnings' ? 'Ganancias' : 'Retiros'}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-xl shadow p-3 sm:p-4 max-h-[60vh] overflow-y-auto">
        {activeTab === 'overview' && (
          <ul className="text-sm text-gray-600 space-y-2">
            <li>Free: 7 referidos</li>
            <li>Starter: 5 referidos</li>
            <li>Pro: 3 referidos</li>
            <li>Elite: sin mínimo</li>
          </ul>
        )}

        {activeTab === 'earnings' &&
          earnings.map(e => (
            <Row
              key={e.id}
              left={`${e.referred_user_username} · ${new Date(e.created_at).toLocaleDateString()}`}
              right={`+${e.amount} USDT`}
            />
          ))}

        {activeTab === 'withdrawals' &&
          withdrawals.map(w => (
            <Row
              key={w.id}
              left={`${new Date(w.created_at).toLocaleDateString()}`}
              right={`${w.amount} USDT · ${w.status}`}
            />
          ))}
      </div>
    </div>
  );
};

/* =======================
   COMPONENTS
======================= */

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
    <Icon className="text-blue-600 w-6 h-6 sm:w-7 sm:h-7" />
    <div>
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>
      <p className="text-lg sm:text-xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const Row = ({ left, right }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b text-sm">
    <span className="text-gray-600">{left}</span>
    <span className="font-semibold text-gray-800">{right}</span>
  </div>
);

export default Referidos;
