import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import BookAppointment from './pages/BookAppointment';
import OtpVerify from './pages/OtpVerify';
import Confirmation from './pages/Confirmation';
import Login from './pages/Login';
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorSchedule from './pages/doctor/Schedule';
import DoctorAppointments from './pages/doctor/Appointments';
import SecretaryDashboard from './pages/secretary/Dashboard';
import ManageAppointments from './pages/secretary/ManageAppointments';
import SearchPatients from './pages/secretary/SearchPatients';
import MedicalRecords from './pages/MedicalRecords';
import Capture from './pages/Capture';
import SiteSettings from './pages/SiteSettings';
import ChatbotSettings from './pages/ChatbotSettings';
import Posts from './pages/Posts';
import Blog from './pages/Blog';
import SinglePost from './pages/SinglePost';
import SeminarRegister from './pages/SeminarRegister';
import SeminarManagement from './pages/doctor/SeminarManagement';
import CommentsManagement from './pages/doctor/CommentsManagement';

function RootRedirect() {
  const { isAuthenticated, isDoctor, isSecretary } = useAuth();
  if (isAuthenticated && isDoctor) return <Navigate to="/doctor/dashboard" replace />;
  if (isAuthenticated && isSecretary) return <Navigate to="/secretary/dashboard" replace />;
  return <Home />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50" dir="rtl">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/verify" element={<OtpVerify />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/login" element={<Login />} />

            <Route path="/doctor/dashboard" element={
              <ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>
            } />
            <Route path="/doctor/schedule" element={
              <ProtectedRoute role="doctor"><DoctorSchedule /></ProtectedRoute>
            } />
            <Route path="/doctor/appointments" element={
              <ProtectedRoute role="doctor"><DoctorAppointments /></ProtectedRoute>
            } />
            <Route path="/doctor/seminar" element={
              <ProtectedRoute role="doctor"><SeminarManagement /></ProtectedRoute>
            } />
            <Route path="/doctor/comments" element={
              <ProtectedRoute role="doctor"><CommentsManagement /></ProtectedRoute>
            } />

            <Route path="/secretary/dashboard" element={
              <ProtectedRoute role={['doctor', 'secretary']}><SecretaryDashboard /></ProtectedRoute>
            } />
            <Route path="/secretary/appointments" element={
              <ProtectedRoute role={['doctor', 'secretary']}><ManageAppointments /></ProtectedRoute>
            } />
            <Route path="/secretary/search" element={
              <ProtectedRoute role={['doctor', 'secretary']}><SearchPatients /></ProtectedRoute>
            } />

            <Route path="/medical-records" element={
              <ProtectedRoute><MedicalRecords /></ProtectedRoute>
            } />
            <Route path="/capture/:recordId" element={<Capture />} />
            <Route path="/site-settings" element={
              <ProtectedRoute><SiteSettings /></ProtectedRoute>
            } />
            <Route path="/chatbot-settings" element={
              <ProtectedRoute><ChatbotSettings /></ProtectedRoute>
            } />
            <Route path="/posts" element={
              <ProtectedRoute><Posts /></ProtectedRoute>
            } />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<SinglePost />} />

            <Route path="/seminar" element={<SeminarRegister />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
