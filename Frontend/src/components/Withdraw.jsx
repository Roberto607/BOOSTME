import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { X, Wallet } from 'lucide-react';

const Withdraw = () => {
  const { user, setUser, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [boostAmount, setBoostAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const hasStoredSession = Boolean(sessionStorage.getItem('accessToken') || sessionStorage.getItem('user'));
    if (!loading && !isAuthenticated && !hasStoredSession) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const earnedBoost = Number(user?.earned_boost || 0);
  const currentWeekWithdrawn = Number(user?.current_week_withdrawn || 0);
  const weeklyLimit = Number(user?.weekly_limit || user?.user_plan?.weekly_withdrawal_limit || 0);
  const walletBalance = Number(user?.balance || 0);
  const availableBoost = Math.max(0, earnedBoost);
  const canWithdraw = availableBoost > 0 && currentWeekWithdrawn < weeklyLimit;
  const remainingToLimit = Math.max(0, weeklyLimit - currentWeekWithdrawn);
  const maxWithdrawAllowed = Math.min(availableBoost, remainingToLimit);

  // Validar dirección Ethereum
  const isValidWallet = walletAddress.startsWith('0x') && walletAddress.length === 42 && /^0x[a-fA-F0-9]{40}$/.test(walletAddress);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!walletAddress) {
      setError('Por favor ingresa una dirección de wallet.');
      return;
    }

    if (!isValidWallet) {
      setError('Dirección de wallet inválida. Debe ser un formato Ethereum válido (0x...)');
      return;
    }

    const amount = Number(boostAmount);
    if (!amount || amount <= 0) {
      setError('Ingresa un monto válido mayor a 0 BOOST.');
      return;
    }

    if (amount > availableBoost) {
      setError('Solo puedes retirar BOOST ganados por tareas.');
      return;
    }

    if (amount > remainingToLimit) {
      setError('Superas el límite semanal de retiro.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await profileService.withdrawBoost(amount, walletAddress);
      setSuccess(`✅ Retiro procesado. Recibirás ${result.received_usdt} USDT en tu wallet. TX: ${result.tx_hash?.slice(0, 10)}...`);
      setBoostAmount('');
      setWalletAddress('');

      const updatedUser = {
        ...user,
        earned_boost: Math.max(0, earnedBoost - amount),
        boost_balance: Math.max(0, (user?.boost_balance || 0) - amount),
        balance: walletBalance + Number(result.received_usdt || 0),
        current_week_withdrawn: currentWeekWithdrawn + amount
      };
      setUser(updatedUser);
    } catch (err) {
      setError(err.message || 'Error procesando el retiro.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-6 rounded-[2rem] bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200 sm:px-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Retiro de BOOST</h1>
              <p className="mt-2 text-sm text-slate-500">100 BOOST = 1 USDT</p>
            </div>
            <button
              className="rounded-full bg-slate-100 p-3 text-slate-700 transition hover:bg-slate-200"
              onClick={() => navigate('/dashboard')}
              aria-label="Volver al dashboard"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-sm text-slate-500">Saldo en Wallet</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{walletBalance.toFixed(2)} USDT</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-900">
              <Wallet className="h-8 w-8" />
            </div>
          </div>

          <div className="grid gap-4 py-6 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">BOOST Ganados</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{availableBoost}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Retirado esta semana</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{currentWeekWithdrawn} / {weeklyLimit} BOOST</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Límite restante</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{remainingToLimit} BOOST</p>
            </div>
          </div>

          {!canWithdraw && (
            <div className="rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">
              <p className="text-sm">
                No puedes retirar ahora. Asegúrate de tener BOOST ganados por tareas y no haber alcanzado el límite semanal.
              </p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Dirección de Wallet (Ethereum/Polygon)
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => {
                  setError(null);
                  setWalletAddress(e.target.value);
                }}
                placeholder="0x..."
                disabled={isProcessing}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              {walletAddress && !isValidWallet && (
                <p className="mt-1 text-xs text-rose-600">Dirección inválida. Debe ser un formato Ethereum válido.</p>
              )}
              {isValidWallet && (
                <p className="mt-1 text-xs text-emerald-600">✓ Dirección válida</p>
              )}
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              BOOST a retirar
              <input
                type="number"
                min="1"
                step="1"
                max={maxWithdrawAllowed}
                value={boostAmount}
                onChange={(e) => {
                  setError(null);
                  setBoostAmount(e.target.value);
                }}
                onBlur={(e) => {
                  const v = Number(e.target.value) || 0;
                  if (v > maxWithdrawAllowed) {
                    setError(`El máximo disponible para retirar ahora es ${maxWithdrawAllowed} BOOST.`);
                    setBoostAmount(String(maxWithdrawAllowed));
                  }
                }}
                placeholder="Ej. 100"
                disabled={isProcessing}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <div className="space-y-1 text-sm text-slate-500">
              <p>Disponible: {availableBoost} BOOST ({(Number(boostAmount) / 100 || 0).toFixed(2)} USDT)</p>
              <p>Máximo retirable ahora: {maxWithdrawAllowed} BOOST</p>
            </div>

            {error && (<p className="rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>)}
            {success && (<p className="rounded-3xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">{success}</p>)}

            <button
              type="submit"
              disabled={!canWithdraw || isProcessing || !boostAmount || !walletAddress || Number(boostAmount) <= 0 || Number(boostAmount) > maxWithdrawAllowed || !isValidWallet}
              className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar retiro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
