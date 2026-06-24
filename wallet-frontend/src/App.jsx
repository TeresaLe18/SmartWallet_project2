import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Index from "./pages/Index";

import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Wallets from "./pages/dashboard/Wallets";
import Kyc from "./pages/dashboard/Kyc";
import Offers from "./pages/dashboard/Offers";
import Profile from "./pages/dashboard/Profile";
import Support from "./pages/dashboard/Support";
import Investment from "./pages/dashboard/Investment";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminServices from "./pages/admin/AdminServices";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminSuspicious from "./pages/admin/AdminSuspicious";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminInvestment from "./pages/admin/AdminInvestment";

import MyQr from "./pages/dashboard/MyQr";
import Notifications from "./pages/dashboard/Notifications";
import AiChatbot from "./pages/dashboard/AiChatbot";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<Profile />} />
          <Route path="qr" element={<MyQr />} />          
          <Route path="wallets" element={<Wallets />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="offers" element={<Offers />} />
          <Route path="support" element={<Support />} />
          <Route path="investment" element={<Investment />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="ai-chatbot" element={<AiChatbot />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="investment" element={<AdminInvestment />} />
          <Route path="suspicious" element={<AdminSuspicious />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="support" element={<AdminSupport />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}