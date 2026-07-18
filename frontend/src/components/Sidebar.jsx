import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const doctorLinks = [
  { to: '/doctor/dashboard', label: 'داشبورد', icon: '📊' },
  { to: '/doctor/schedule', label: 'برنامه هفتگی', icon: '📅' },
  { to: '/doctor/seminar', label: 'سمینار', icon: '🎓' },
  { to: '/doctor/appointments', label: 'نوبت‌ها', icon: '📋' },
  { to: '/secretary/dashboard', label: 'مدیریت نوبت‌ها', icon: '📋' },
  { to: '/secretary/search', label: 'جستجوی بیماران', icon: '🔍' },
  { to: '/medical-records', label: 'پرونده پزشکی', icon: '📁' },
  { to: '/posts', label: 'پست‌ها', icon: '📝' },
  { to: '/chatbot-settings', label: 'چت‌بات هوشمند', icon: '🤖' },
  { to: '/doctor/comments', label: 'نظرات', icon: '💬' },
  { to: '/site-settings', label: 'تنظیمات سایت', icon: '⚙️' },
];

const secretaryLinks = [
  { to: '/secretary/dashboard', label: 'داشبورد', icon: '📊' },
  { to: '/secretary/appointments', label: 'مدیریت نوبت‌ها', icon: '📋' },
  { to: '/secretary/search', label: 'جستجوی بیماران', icon: '🔍' },
  { to: '/medical-records', label: 'پرونده پزشکی', icon: '📁' },
  { to: '/posts', label: 'پست‌ها', icon: '📝' },
];

export default function Sidebar() {
  const { isDoctor, isSecretary, logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = isDoctor ? doctorLinks : isSecretary ? secretaryLinks : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 right-4 z-50 bg-medical-600 text-white p-2 rounded-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        style={{ right: 0 }}
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-medical-700">نوبت یار</h2>
          <p className="text-xs text-gray-500 mt-1">{user?.full_name}</p>
          <span className="text-xs text-medical-600 bg-medical-50 px-2 py-0.5 rounded-full">
            {isDoctor ? 'پزشک / منشی' : 'منشی'}
          </span>
        </div>

        <nav className="p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition duration-200 ${
                  isActive
                    ? 'bg-medical-50 text-medical-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <span>🚪</span>
            <span>خروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
