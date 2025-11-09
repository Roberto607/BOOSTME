import { Routes, Route } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import Home from '../components/Home';
import AccountActivation from '../components/AccountActivation';
import RevisarCorreo from "../components/RevisarCorreo";
import Login from "../components/Login";
import Dashboard from "../components/Dashboard";
import ForgotPassword from "../components/auth/ForgotPassword";
import ResetPassword from "../components/auth/ResetPassword";
import Profile from "../components/Perfil/Profile";
import DepositForm from "../components/Deposito/DepositForm";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/verify-email/:uidb64/:token" element={<AccountActivation />} />
      <Route path="/revisar-correo" element={<RevisarCorreo />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />
      <Route path="/Profile" element={<Profile />} />
      <Route path="/deposit" element={<DepositForm />} />
      
    </Routes>
  );
};

export default AppRoutes;
