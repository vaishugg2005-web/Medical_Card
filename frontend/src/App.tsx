import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PatientAuthPage from './pages/PatientAuthPage';
import PatientDashboardPage from './pages/PatientDashboardPage';
import DoctorAuthPage from './pages/DoctorAuthPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import AdminAuthPage from './pages/AdminAuthPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminRegisterPage from './pages/AdminRegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Patient Portal Routes */}
        <Route path="/patient_dashboard" element={<PatientAuthPage />} />
        <Route path="/patient_dashboard/:patient_user_name" element={<PatientDashboardPage />} />

        {/* Doctor Portal Routes (Supporting both PascalCase and lowercase) */}
        <Route path="/Doctor_dashboard" element={<DoctorAuthPage />} />
        <Route path="/Doctor_dashboard/:Doctor_Name" element={<DoctorDashboardPage />} />
        <Route path="/doctor_dashboard" element={<DoctorAuthPage />} />
        <Route path="/doctor_dashboard/:Doctor_Name" element={<DoctorDashboardPage />} />

        {/* Admin Portal Routes */}
        <Route path="/admin_dashboard" element={<AdminAuthPage />} />
        <Route path="/admin_dashboard/register" element={<AdminRegisterPage />} />
        <Route path="/admin_dashboard/:admin_name" element={<AdminDashboardPage />} />

        {/* Fallback to Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
