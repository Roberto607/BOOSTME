import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import VerifyWallet from "../components/VerifyWallet";
import Home from '../components/Home';
import AccountActivation from '../components/AccountActivation';
import RevisarCorreo from "../components/RevisarCorreo";
import Login from "../components/Login";
import Dashboard from "../components/Dashboard";
import ForgotPassword from "../components/auth/ForgotPassword";
import ResetPassword from "../components/auth/ResetPassword";
import Profile from "../components/Perfil/Profile";
import Plans from "../components/Plans/Plans";
import Bonuses from "../components/Bonuses/bonuses"
import Withdraw from "../components/Withdraw";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";
import ContactPage from "../components/ContactPage";
import HelpPage from "../components/HelpPage";
import QuickHelpPage from "../components/QuickHelpPage";
import WithdrawInfoPage from "../components/WithdrawInfoPage";
import PrivacyPage from "../components/PrivacyPage";
import HowItWorksPage from "../components/HowItWorksPage";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  const isSessionValid = Boolean(isAuthenticated && user);

  if (loading) return <LoadingScreen />;
  if (!isSessionValid) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/verify-wallet" element={<VerifyWallet />} />
      <Route path="/verify-email/:uidb64/:token" element={<AccountActivation />} />
      <Route path="/revisar-correo" element={<RevisarCorreo />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/tasks" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/bonuses" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />
      <Route path="/Profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/deposit" element={<Plans />} />
      <Route path="/bonuses" element={<Bonuses />} />
      <Route path="/Referidos" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/referidos" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/referidos" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/quick-help" element={<QuickHelpPage />} />
      <Route path="/withdraw-info" element={<WithdrawInfoPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
